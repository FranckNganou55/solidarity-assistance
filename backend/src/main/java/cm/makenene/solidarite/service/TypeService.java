package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.dto.TypeDtos;
import cm.makenene.solidarite.entity.AssistanceType;
import cm.makenene.solidarite.repository.AssistanceTypeRepository;
import cm.makenene.solidarite.repository.EventRepository;
import cm.makenene.solidarite.repository.AssociationGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TypeService {

    private final AssistanceTypeRepository repository;
    private final EventRepository eventRepository;
    private final CurrentUser currentUser;
    private final AuditService auditService;
    private final AssociationGroupRepository groups;

    public TypeService(AssistanceTypeRepository repository, EventRepository eventRepository,
                       CurrentUser currentUser, AuditService auditService, AssociationGroupRepository groups) {
        this.repository = repository;
        this.eventRepository = eventRepository;
        this.currentUser = currentUser;
        this.auditService = auditService;
        this.groups = groups;
    }

    public List<TypeDtos.TypeView> findAll(Boolean activeOnly) {
        return repository.findAllByGroupIdOrderByNameAsc(currentUser.requireGroupId()).stream()
                .filter(t -> activeOnly == null || !activeOnly || t.isActive())
                .map(this::toView).toList();
    }

    public TypeDtos.TypeView toView(AssistanceType t) {
        long count = eventRepository.countByGroupIdAndTypeId(currentUser.requireGroupId(), t.getId());
        return new TypeDtos.TypeView(t.getId(), t.getName(), t.getDescription(), t.getIcon(), t.isActive(), t.getCreatedAt(), count);
    }

    public AssistanceType get(Long id) {
        return repository.findById(id).filter(t -> t.getGroup().getId().equals(currentUser.requireGroupId())).orElseThrow(() -> ApiException.notFound("Type d'assistance introuvable"));
    }

    @Transactional
    public TypeDtos.TypeView create(TypeDtos.TypeRequest req) {
        Long groupId = currentUser.requireGroupId();
        if (repository.existsByGroupIdAndNameIgnoreCase(groupId, req.name().trim()))
            throw ApiException.conflict("Ce type d'assistance existe deja");
        AssistanceType type = AssistanceType.builder()
                .group(groups.findById(groupId).orElseThrow(() -> ApiException.notFound("Groupe introuvable")))
                .name(req.name().trim())
                .description(req.description())
                .icon(req.icon() == null ? "🤝" : req.icon())
                .active(req.active() == null || req.active())
                .createdBy(currentUser.id())
                .build();
        repository.save(type);
        auditService.log("TYPE_CREATE", "AssistanceType", type.getId(), "Creation du type " + type.getName());
        return toView(type);
    }

    @Transactional
    public TypeDtos.TypeView update(Long id, TypeDtos.TypeRequest req) {
        AssistanceType type = get(id);
        if (!type.getName().equalsIgnoreCase(req.name().trim()) && repository.existsByGroupIdAndNameIgnoreCase(currentUser.requireGroupId(), req.name().trim()))
            throw ApiException.conflict("Ce type d'assistance existe deja");
        type.setName(req.name().trim());
        type.setDescription(req.description());
        if (req.icon() != null) type.setIcon(req.icon());
        if (req.active() != null) type.setActive(req.active());
        repository.save(type);
        auditService.log("TYPE_UPDATE", "AssistanceType", id, "Mise a jour du type " + type.getName());
        return toView(type);
    }

    @Transactional
    public void deactivate(Long id) {
        AssistanceType type = get(id);
        type.setActive(false);
        repository.save(type);
        auditService.log("TYPE_DEACTIVATE", "AssistanceType", id, "Desactivation du type " + type.getName());
    }
}
