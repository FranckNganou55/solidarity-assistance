package cm.makenene.solidarite.dto;
import java.util.List;
public class GroupDtos {
    public record GroupView(Long id, String name, String logoUrl, String city, String description, String contactPhone, String contactEmail, String primaryColor, String accentColor, String currency, int minAssistancesRequired, boolean principalAdmin, String roleName) {}
    public record GroupCreateRequest(String name, String logoUrl, String city, String description, String contactPhone, String contactEmail, String primaryColor, String accentColor, String currency, Integer minAssistancesRequired, AdminMember admin) {}
    public record GroupUpdateRequest(String name, String logoUrl, String city, String description, String contactPhone, String contactEmail, String primaryColor, String accentColor, String currency, Integer minAssistancesRequired) {}
    public record AdminMember(String firstName, String lastName, String phone, String quarter, String email, String password) {}
    public record AddMemberRequest(Long memberId) {}
    public record GroupList(List<GroupView> groups) {}
}
