package cm.makenene.solidarite.bootstrap;

import cm.makenene.solidarite.domain.ContributionMethod;
import cm.makenene.solidarite.domain.ContributionStatus;
import cm.makenene.solidarite.domain.EventStatus;
import cm.makenene.solidarite.domain.Permission;
import cm.makenene.solidarite.entity.*;
import cm.makenene.solidarite.repository.*;
import cm.makenene.solidarite.service.MemberService;
import cm.makenene.solidarite.service.SettingService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Initialise les roles, permissions, parametres et un jeu de donnees de demonstration.
 * Ne s'execute que si la base est vide.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final MemberRepository memberRepository;
    private final AssistanceTypeRepository typeRepository;
    private final EventRepository eventRepository;
    private final ContributionRepository contributionRepository;
    private final SettingService settingService;
    private final PasswordEncoder passwordEncoder;
    private final AssociationGroupRepository groupRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    @Value("${app.seed-demo-data:false}") private boolean seedDemoData;
    @Value("${app.bootstrap-admin.phone:}") private String bootstrapAdminPhone;
    @Value("${app.bootstrap-admin.password:}") private String bootstrapAdminPassword;

    public DataSeeder(RoleRepository roleRepository, MemberRepository memberRepository,
                      AssistanceTypeRepository typeRepository, EventRepository eventRepository,
                      ContributionRepository contributionRepository, SettingService settingService,
                      PasswordEncoder passwordEncoder, AssociationGroupRepository groupRepository,
                      GroupMembershipRepository groupMembershipRepository) {
        this.roleRepository = roleRepository;
        this.memberRepository = memberRepository;
        this.typeRepository = typeRepository;
        this.eventRepository = eventRepository;
        this.contributionRepository = contributionRepository;
        this.settingService = settingService;
        this.passwordEncoder = passwordEncoder;
        this.groupRepository = groupRepository;
        this.groupMembershipRepository = groupMembershipRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (roleRepository.count() > 0) return;

        AssociationGroup defaultGroup = groupRepository.save(AssociationGroup.builder().name("Makénéné Solidarité")
                .createdBy(1L).primaryColor("#264557").accentColor("#F3856A").currency("FCFA").build());

        Role admin = roleRepository.save(Role.builder().group(defaultGroup)
                .code("ADMIN").name("Administrateur")
                .description("Acces complet a toutes les fonctionnalites de l'application")
                .systemRole(true).permissions(EnumSet.allOf(Permission.class)).build());

        Role gestionnaire = roleRepository.save(Role.builder().group(defaultGroup)
                .code("GESTIONNAIRE").name("Gestionnaire des assistances")
                .description("Cree les types d'assistance, ouvre et cloture les assistances")
                .systemRole(true)
                .permissions(EnumSet.of(Permission.MEMBER_VIEW, Permission.ASSISTANCE_TYPE_VIEW,
                        Permission.ASSISTANCE_TYPE_CREATE, Permission.ASSISTANCE_TYPE_EDIT, Permission.ASSISTANCE_TYPE_DELETE,
                        Permission.EVENT_VIEW, Permission.EVENT_CREATE, Permission.EVENT_EDIT,
                        Permission.EVENT_CLOSE, Permission.EVENT_CANCEL, Permission.REQUEST_VIEW,
                        Permission.REQUEST_APPROVE, Permission.REQUEST_REJECT,
                        Permission.CONTRIBUTION_VIEW_ALL, Permission.REPORT_VIEW))
                .build());

        Role tresorier = roleRepository.save(Role.builder().group(defaultGroup)
                .code("TRESORIER").name("Tresorier")
                .description("Valide les cotisations des membres")
                .systemRole(true)
                .permissions(EnumSet.of(Permission.MEMBER_VIEW, Permission.EVENT_VIEW,
                        Permission.CONTRIBUTION_VIEW_ALL, Permission.CONTRIBUTION_VALIDATE, Permission.CONTRIBUTION_REJECT,
                        Permission.REPORT_VIEW, Permission.CONTRIBUTION_SUBMIT, Permission.REQUEST_CREATE))
                .build());

        Role membre = roleRepository.save(Role.builder().group(defaultGroup)
                .code("MEMBRE").name("Membre")
                .description("Soumet ses cotisations et demande une assistance")
                .systemRole(true)
                .permissions(EnumSet.of(Permission.EVENT_VIEW, Permission.CONTRIBUTION_SUBMIT, Permission.CONTRIBUTION_VIEW,
                        Permission.REQUEST_CREATE, Permission.ASSISTANCE_TYPE_VIEW))
                .build());

        if (!seedDemoData) {
            if (bootstrapAdminPhone != null && !bootstrapAdminPhone.isBlank()
                    && bootstrapAdminPassword != null && !bootstrapAdminPassword.isBlank()) {
                memberRepository.save(Member.builder().firstName("Administrateur").lastName("Système")
                        .phone(MemberService.normalizePhone(bootstrapAdminPhone)).city("Makenene")
                        .passwordHash(passwordEncoder.encode(bootstrapAdminPassword)).mustChangePassword(true)
                        .active(true).role(admin).bureauPosition("DIRECTEUR").build());
            }
            System.out.println("Makénéné Solidarité : données de démonstration désactivées.");
            return;
        }

        String pwd = passwordEncoder.encode("Mak2026");

        Member president = memberRepository.save(Member.builder()
                .firstName("Jean").lastName("Mbarga").phone("690000001")
                .city("Makenene").quarter("Centre").email("admin@makenene.cm")
                .passwordHash(pwd).mustChangePassword(false).active(true).superAdmin(true).role(admin)
                .bureauPosition("DIRECTEUR")
                .build());

        Member gestion = memberRepository.save(Member.builder()
                .firstName("Clarisse").lastName("Ngo Bassong").phone("690000002")
                .city("Makenene").quarter("Nkolmekong")
                .passwordHash(pwd).mustChangePassword(false).active(true).role(gestionnaire)
                .bureauPosition("MEMBRE_BUREAU")
                .build());

        Member treso = memberRepository.save(Member.builder()
                .firstName("Paul").lastName("Etoa").phone("690000003")
                .city("Makenene").quarter("Makenene II")
                .passwordHash(pwd).mustChangePassword(false).active(true).role(tresorier)
                .bureauPosition("TRESORIER")
                .build());

        List<Member> villagers = new ArrayList<>();
        String[][] people = {
                {"Marie", "Nkoulou", "677000101", "Centre"},
                {"Serge", "Fotso", "677000102", "Biyem-Assi"},
                {"Alice", "Manga", "677000103", "Nkolmekong"},
                {"Bertrand", "Kamdem", "677000104", "Makenene II"},
                {"Estelle", "Ngono", "677000105", "Centre"},
                {"Ibrahim", "Sali", "677000106", "Sabongari"},
                {"Rosine", "Atangana", "677000107", "Nkolmekong"},
                {"David", "Tchouta", "677000108", "Centre"}
        };
        for (String[] p : people) {
            villagers.add(memberRepository.save(Member.builder()
                    .firstName(p[0]).lastName(p[1]).phone(p[2])
                    .city("Makenene").quarter(p[3])
                    .passwordHash(pwd).mustChangePassword(true).active(true).role(membre)
                    .build()));
        }

        groupMembershipRepository.save(GroupMembership.builder().group(defaultGroup).member(president).role(admin).principalAdmin(true).active(true).build());
        groupMembershipRepository.save(GroupMembership.builder().group(defaultGroup).member(gestion).role(gestionnaire).active(true).build());
        groupMembershipRepository.save(GroupMembership.builder().group(defaultGroup).member(treso).role(tresorier).active(true).build());
        for (Member person : villagers) {
            groupMembershipRepository.save(GroupMembership.builder().group(defaultGroup).member(person).role(membre).active(true)
                    .cycleContributions(person.getCycleContributions()).totalContributions(person.getTotalContributions()).build());
        }

        AssistanceType deces = typeRepository.save(AssistanceType.builder()
                .group(defaultGroup).name("Deces").icon("🕊️").description("Soutien a la famille lors d'un deces")
                .createdBy(admin.getId()).build());
        AssistanceType maladie = typeRepository.save(AssistanceType.builder()
                .group(defaultGroup).name("Maladie").icon("🏥").description("Aide aux frais medicaux d'un membre")
                .createdBy(admin.getId()).build());
        AssistanceType mariage = typeRepository.save(AssistanceType.builder()
                .group(defaultGroup).name("Mariage").icon("💍").description("Soutien lors d'un mariage")
                .createdBy(admin.getId()).build());
        AssistanceType accident = typeRepository.save(AssistanceType.builder()
                .group(defaultGroup).name("Accident").icon("🚑").description("Aide en cas d'accident")
                .createdBy(admin.getId()).build());
        AssistanceType naissance = typeRepository.save(AssistanceType.builder()
                .group(defaultGroup).name("Naissance").icon("👶").description("Soutien a la naissance d'un enfant")
                .createdBy(admin.getId()).build());

        // Historique : deux assistances cloturees pour donner du relief aux statistiques
        AssistanceEvent past = eventRepository.save(AssistanceEvent.builder()
                .group(defaultGroup).reference("ASS-2025-0001").type(deces).beneficiary(villagers.get(0))
                .description("Deces du pere de Marie Nkoulou").status(EventStatus.CLOSED)
                .closingDate(LocalDate.now().minusDays(40)).closedAt(Instant.now().minus(40, java.time.temporal.ChronoUnit.DAYS))
                .closedBy(gestion.getId()).createdBy(gestion.getId())
                .targetAmount(new BigDecimal("150000")).build());

        AssistanceEvent past2 = eventRepository.save(AssistanceEvent.builder()
                .group(defaultGroup).reference("ASS-2025-0002").type(maladie).beneficiary(villagers.get(1))
                .description("Hospitalisation de Serge Fotso").status(EventStatus.CLOSED)
                .closingDate(LocalDate.now().minusDays(12)).closedAt(Instant.now().minus(12, java.time.temporal.ChronoUnit.DAYS))
                .closedBy(gestion.getId()).createdBy(gestion.getId())
                .targetAmount(new BigDecimal("200000")).build());

        for (int i = 2; i < villagers.size(); i++) {
            Member m = villagers.get(i);
            contributionRepository.save(Contribution.builder()
                    .event(past).member(m).amount(new BigDecimal("5000"))
                    .method(ContributionMethod.MOBILE_MONEY).status(ContributionStatus.VALIDATED)
                    .paymentReceived(true).receiptReference("REC-2025-0001")
                    .paymentReceivedAt(Instant.now().minus(41, java.time.temporal.ChronoUnit.DAYS))
                    .paymentReceivedBy(treso.getId())
                    .cycleNumber(1)
                    .submittedAt(Instant.now().minus(42, java.time.temporal.ChronoUnit.DAYS))
                    .validatedAt(Instant.now().minus(41, java.time.temporal.ChronoUnit.DAYS)).validatedBy(treso.getId()).build());
            m.setCycleContributions(m.getCycleContributions() + 1);
            m.setTotalContributions(m.getTotalContributions() + 1);
            contributionRepository.save(Contribution.builder()
                    .event(past2).member(m).amount(new BigDecimal("10000"))
                    .method(ContributionMethod.CASH).status(ContributionStatus.VALIDATED)
                    .paymentReceived(true).receiptReference("REC-2025-0002")
                    .paymentReceivedAt(Instant.now().minus(13, java.time.temporal.ChronoUnit.DAYS))
                    .paymentReceivedBy(treso.getId())
                    .cycleNumber(2)
                    .submittedAt(Instant.now().minus(14, java.time.temporal.ChronoUnit.DAYS))
                    .validatedAt(Instant.now().minus(13, java.time.temporal.ChronoUnit.DAYS)).validatedBy(treso.getId()).build());
            m.setCycleContributions(m.getCycleContributions() + 1);
            m.setTotalContributions(m.getTotalContributions() + 1);
            memberRepository.save(m);
        }

        // Une assistance en cours, ouverte aux cotisations
        AssistanceEvent open = eventRepository.save(AssistanceEvent.builder()
                .group(defaultGroup).reference("ASS-2026-0001").type(accident).beneficiary(villagers.get(3))
                .description("Accident de moto de Bertrand Kamdem")
                .status(EventStatus.OPEN).closingDate(LocalDate.now().plusDays(9))
                .createdBy(gestion.getId()).targetAmount(new BigDecimal("300000")).build());

        contributionRepository.save(Contribution.builder()
                .event(open).member(villagers.get(4)).amount(new BigDecimal("5000"))
                .method(ContributionMethod.CASH).status(ContributionStatus.PENDING).cycleNumber(3).build());
        contributionRepository.save(Contribution.builder()
                .event(open).member(villagers.get(5)).amount(new BigDecimal("7000"))
                .method(ContributionMethod.MOBILE_MONEY).status(ContributionStatus.PENDING).cycleNumber(3).build());
        contributionRepository.save(Contribution.builder()
                .event(open).member(villagers.get(6)).amount(new BigDecimal("5000"))
                .method(ContributionMethod.TRANSFER).status(ContributionStatus.VALIDATED)
                .paymentReceived(true).receiptReference("REC-2026-0001")
                .paymentReceivedAt(Instant.now().minus(6, java.time.temporal.ChronoUnit.HOURS))
                .paymentReceivedBy(treso.getId())
                .cycleNumber(3)
                .submittedAt(Instant.now().minus(8, java.time.temporal.ChronoUnit.HOURS))
                .validatedAt(Instant.now().minus(6, java.time.temporal.ChronoUnit.HOURS)).validatedBy(treso.getId()).build());
        Member rosine = villagers.get(6);
        rosine.setCycleContributions(rosine.getCycleContributions() + 1);
        rosine.setTotalContributions(rosine.getTotalContributions() + 1);
        memberRepository.save(rosine);
        villagers.forEach(person -> groupMembershipRepository.findByGroupIdAndMemberId(defaultGroup.getId(), person.getId()).ifPresent(gm -> {
            gm.setCycleContributions(person.getCycleContributions()); gm.setTotalContributions(person.getTotalContributions());
            groupMembershipRepository.save(gm);
        }));

        System.out.println("""

            ============================================================
             MAKENENE SOLIDARITE - donnees de demonstration chargees
            ------------------------------------------------------------
             Administrateur : 690000001 / Mak2026
             Gestionnaire   : 690000002 / Mak2026
             Tresorier      : 690000003 / Mak2026
             Membre         : 677000101 / Mak2026 (doit changer le mot de passe)
            ============================================================
            """);
    }
}
