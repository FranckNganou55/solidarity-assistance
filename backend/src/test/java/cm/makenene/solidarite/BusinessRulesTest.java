package cm.makenene.solidarite;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifie les regles metier structurantes :
 *  - un membre ne peut pas demander une assistance si son cycle est incomplet ;
 *  - apres validation de ses cotisations il devient eligible ;
 *  - une assistance cloturee ne peut plus etre modifiee que par l'administrateur ;
 *  - un membre ne peut pas cotiser deux fois a la meme assistance.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("demo")
class BusinessRulesTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    private String login(String phone, String password) throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    private String bearer(String token) { return "Bearer " + token; }

    @Test
    void memberCannotRequestAssistanceUntilCycleCompleted() throws Exception {
        String member = login("677000101", "Mak2026");   // cycle 0/2
        mvc.perform(post("/api/requests").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"typeId\":1,\"reason\":\"Deces dans ma famille\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("assister")));
    }

    @Test
    void memberBecomesEligibleAfterContributionsAreValidated() throws Exception {
        String admin = login("690000001", "Mak2026");
        String member = login("677000101", "Mak2026");
        int required = 2;

        // cree deux assistances a venir pour ce membre
        MvcResult created = mvc.perform(post("/api/events").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"typeId\":1,\"beneficiaryId\":5,\"description\":\"Test cycle A\"}"))
                .andExpect(status().isOk()).andReturn();
        long firstEventId = mapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        MvcResult created2 = mvc.perform(post("/api/events").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"typeId\":2,\"beneficiaryId\":6,\"description\":\"Test cycle B\"}"))
                .andExpect(status().isOk()).andReturn();
        long secondEventId = mapper.readTree(created2.getResponse().getContentAsString()).get("id").asLong();

        for (long eventId : new long[]{firstEventId, secondEventId}) {
            MvcResult contrib = mvc.perform(post("/api/events/" + eventId + "/contributions")
                            .header("Authorization", bearer(member))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":5000,\"method\":\"CASH\"}"))
                    .andExpect(status().isOk()).andReturn();
            long contributionId = mapper.readTree(contrib.getResponse().getContentAsString()).get("id").asLong();

            // le tresorier doit d'abord confirmer avoir percu l'argent
            mvc.perform(post("/api/contributions/" + contributionId + "/validate")
                            .header("Authorization", bearer(admin))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("percu")));

            mvc.perform(post("/api/contributions/" + contributionId + "/validate")
                            .header("Authorization", bearer(admin))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"paymentReceived\":true,\"receiptReference\":\"REC-TEST-01\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("VALIDATED"))
                    .andExpect(jsonPath("$.paymentReceived").value(true))
                    .andExpect(jsonPath("$.receiptReference").value("REC-TEST-01"));
        }

        JsonNode me = mapper.readTree(mvc.perform(get("/api/auth/me").header("Authorization", bearer(member)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(me.get("cycleContributions").asInt()).isGreaterThanOrEqualTo(required);
        assertThat(me.get("eligibleForAssistance").asBoolean()).isTrue();

        // la demande passe desormais
        mvc.perform(post("/api/requests").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"typeId\":1,\"reason\":\"Deces dans ma famille\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true));
    }

    @Test
    void closedEventCanOnlyBeModifiedByAdmin() throws Exception {
        String admin = login("690000001", "Mak2026");
        String manager = login("690000002", "Mak2026");

        MvcResult created = mvc.perform(post("/api/events").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"typeId\":1,\"beneficiaryId\":8,\"description\":\"Assistance a cloturer\"}"))
                .andExpect(status().isOk()).andReturn();
        long eventId = mapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(post("/api/events/" + eventId + "/close").header("Authorization", bearer(manager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"closingDate\":\"2030-01-31\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        // le gestionnaire ne peut plus modifier
        mvc.perform(put("/api/events/" + eventId).header("Authorization", bearer(manager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"tentative\"}"))
                .andExpect(status().isForbidden());

        // l'administrateur peut
        mvc.perform(put("/api/events/" + eventId).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"modifie par l'admin\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("modifie par l'admin"));
    }

    @Test
    void memberCannotContributeTwiceToSameEvent() throws Exception {
        String admin = login("690000001", "Mak2026");
        String member = login("677000103", "Mak2026");

        MvcResult created = mvc.perform(post("/api/events").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"typeId\":3,\"beneficiaryId\":9,\"description\":\"Mariage\"}"))
                .andExpect(status().isOk()).andReturn();
        long eventId = mapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(post("/api/events/" + eventId + "/contributions").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":3000,\"method\":\"MOBILE_MONEY\"}"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/events/" + eventId + "/contributions").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":3000,\"method\":\"CASH\"}"))
                .andExpect(status().isConflict());
    }
}
