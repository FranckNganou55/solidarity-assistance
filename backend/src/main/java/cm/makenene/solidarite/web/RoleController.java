package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.CommonDtos;
import cm.makenene.solidarite.dto.RoleDtos;
import cm.makenene.solidarite.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAnyAuthority('PERM_ROLE_VIEW','PERM_ROLE_CREATE','PERM_ROLE_EDIT')")
    public List<RoleDtos.PermissionView> permissions() { return roleService.permissionCatalogue(); }

    @GetMapping("/roles")
    @PreAuthorize("hasAnyAuthority('PERM_ROLE_VIEW','PERM_ROLE_CREATE','PERM_ROLE_EDIT','PERM_ROLE_ASSIGN')")
    public List<RoleDtos.RoleView> roles() { return roleService.findAll(); }

    @PostMapping("/roles")
    @PreAuthorize("hasAuthority('PERM_ROLE_CREATE')")
    public RoleDtos.RoleView create(@Valid @RequestBody RoleDtos.RoleRequest req) { return roleService.create(req); }

    @PutMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('PERM_ROLE_EDIT')")
    public RoleDtos.RoleView update(@PathVariable Long id, @Valid @RequestBody RoleDtos.RoleRequest req) {
        return roleService.update(id, req);
    }

    @DeleteMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('PERM_ROLE_DELETE')")
    public CommonDtos.MessageResponse delete(@PathVariable Long id) {
        roleService.delete(id);
        return new CommonDtos.MessageResponse("Role supprime");
    }
}
