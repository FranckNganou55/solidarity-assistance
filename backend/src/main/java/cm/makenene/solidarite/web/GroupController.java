package cm.makenene.solidarite.web;
import cm.makenene.solidarite.dto.GroupDtos;
import cm.makenene.solidarite.service.GroupService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
    private final GroupService service;
    public GroupController(GroupService service) { this.service=service; }
    @GetMapping public List<GroupDtos.GroupView> mine() { return service.mine(); }
    @PostMapping @PreAuthorize("hasAuthority('PERM_GROUP_CREATE')")
    public GroupDtos.GroupView create(@RequestBody GroupDtos.GroupCreateRequest req) { return service.create(req); }
    @PutMapping("/{groupId}")
    public GroupDtos.GroupView update(@PathVariable Long groupId, @RequestBody GroupDtos.GroupUpdateRequest req) { return service.update(groupId, req); }
    @DeleteMapping("/{groupId}")
    public void delete(@PathVariable Long groupId) { service.delete(groupId); }
    @PostMapping("/{groupId}/members") @PreAuthorize("hasAuthority('PERM_MEMBER_CREATE')")
    public GroupDtos.GroupView addMember(@PathVariable Long groupId, @RequestBody GroupDtos.AddMemberRequest req) { return service.addMember(groupId, req.memberId()); }
}
