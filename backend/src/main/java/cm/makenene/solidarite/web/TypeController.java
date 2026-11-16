package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.CommonDtos;
import cm.makenene.solidarite.dto.TypeDtos;
import cm.makenene.solidarite.service.TypeService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assistance-types")
public class TypeController {

    private final TypeService typeService;

    public TypeController(TypeService typeService) {
        this.typeService = typeService;
    }

    @GetMapping
    public List<TypeDtos.TypeView> list(@RequestParam(required = false) Boolean activeOnly) {
        return typeService.findAll(activeOnly);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_ASSISTANCE_TYPE_CREATE')")
    public TypeDtos.TypeView create(@Valid @RequestBody TypeDtos.TypeRequest req) { return typeService.create(req); }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_ASSISTANCE_TYPE_EDIT')")
    public TypeDtos.TypeView update(@PathVariable Long id, @Valid @RequestBody TypeDtos.TypeRequest req) {
        return typeService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_ASSISTANCE_TYPE_DELETE')")
    public CommonDtos.MessageResponse deactivate(@PathVariable Long id) {
        typeService.deactivate(id);
        return new CommonDtos.MessageResponse("Type desactive");
    }
}
