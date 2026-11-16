package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.SettingDtos;
import cm.makenene.solidarite.service.SettingService;
import cm.makenene.solidarite.service.StorageService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingService settingService;
    private final StorageService storageService;

    public SettingsController(SettingService settingService, StorageService storageService) {
        this.settingService = settingService;
        this.storageService = storageService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_SETTINGS_VIEW')")
    public SettingDtos.SettingsView get() { return settingService.view(); }

    @PutMapping
    @PreAuthorize("hasAuthority('PERM_SETTINGS_MANAGE')")
    public SettingDtos.SettingsView update(@RequestBody SettingDtos.SettingsUpdateRequest req) {
        return settingService.update(req);
    }

    /** Upload du logo (administrateur) : renvoie l'URL publique a enregistrer. */
    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('PERM_SETTINGS_MANAGE')")
    public Map<String, String> uploadLogo(@RequestPart("file") MultipartFile file) {
        String url = storageService.store(file, "logo");
        settingService.set(SettingService.ORG_LOGO, url);
        return Map.of("logoUrl", url);
    }

    /** Retourne le catalogue des permissions (pratique pour l'ecran de configuration). */
    @GetMapping("/permission-groups")
    @PreAuthorize("hasAuthority('PERM_SETTINGS_VIEW')")
    public Map<String, Object> info() {
        return Map.of("settings", settingService.view());
    }
}
