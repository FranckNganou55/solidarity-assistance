package cm.makenene.solidarite.service;

import cm.makenene.solidarite.dto.SettingDtos;
import cm.makenene.solidarite.entity.AppSetting;
import cm.makenene.solidarite.repository.SettingRepository;
import cm.makenene.solidarite.repository.AssociationGroupRepository;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.entity.AssociationGroup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.math.BigDecimal;

@Service
public class SettingService {

    public static final String ORG_NAME = "org.name";
    public static final String ORG_LOGO = "org.logo.url";
    public static final String ORG_PRIMARY = "org.primary.color";
    public static final String ORG_ACCENT = "org.accent.color";
    public static final String ORG_CURRENCY = "org.currency";
    public static final String ORG_MOTTO = "org.motto";
    public static final String ORG_PHONE = "org.contact.phone";
    public static final String ORG_EMAIL = "org.contact.email";
    public static final String RULES_MIN = "rules.min.contributions";
    public static final String RULES_MIN_AMOUNT = "rules.min.contribution.amount";
    public static final String DEFAULT_LOCALE = "app.default.locale";
    public static final String DEFAULT_THEME = "app.default.theme";
    public static final String DEFAULT_PASSWORD = "org.default.password";

    private static final Map<String, String> DEFAULTS;

    static {
        Map<String, String> d = new LinkedHashMap<>();
        d.put(ORG_NAME, "Makénéné Solidarité");
        d.put(ORG_LOGO, "/uploads/logo-makenene.png");
        d.put(ORG_PRIMARY, "#264557");
        d.put(ORG_ACCENT, "#F3856A");
        d.put(ORG_CURRENCY, "FCFA");
        d.put(ORG_MOTTO, "Unis pour aider, ensemble pour grandir");
        d.put(ORG_PHONE, "");
        d.put(ORG_EMAIL, "");
        d.put(RULES_MIN, "2");
        d.put(RULES_MIN_AMOUNT, "0");
        d.put(DEFAULT_LOCALE, "fr");
        d.put(DEFAULT_THEME, "system");
        d.put(DEFAULT_PASSWORD, "Mak2026");
        DEFAULTS = java.util.Collections.unmodifiableMap(d);
    }

    private final SettingRepository repository;
    private final AssociationGroupRepository groups;
    private final CurrentUser currentUser;

    public SettingService(SettingRepository repository, AssociationGroupRepository groups, CurrentUser currentUser) {
        this.repository = repository;
        this.groups = groups;
        this.currentUser = currentUser;
    }

    public String get(String key) {
        AssociationGroup group = activeGroup();
        if (group != null) {
            String value = switch (key) {
                case ORG_NAME -> group.getName(); case ORG_LOGO -> group.getLogoUrl();
                case ORG_PRIMARY -> group.getPrimaryColor(); case ORG_ACCENT -> group.getAccentColor();
                case ORG_CURRENCY -> group.getCurrency(); case RULES_MIN -> String.valueOf(group.getMinAssistancesRequired());
                case RULES_MIN_AMOUNT -> group.getMinContributionAmount().toPlainString();
                case ORG_PHONE -> group.getContactPhone(); case ORG_EMAIL -> group.getContactEmail(); default -> null;
            };
            if (value != null) return value;
        }
        return repository.findById(key).map(AppSetting::getValue)
                .orElse(DEFAULTS.getOrDefault(key, ""));
    }

    private AssociationGroup activeGroup() {
        Long id = currentUser.optionalGroupId();
        return id == null ? null : groups.findById(id).orElse(null);
    }

    public int getInt(String key) {
        try { return Integer.parseInt(get(key).trim()); }
        catch (NumberFormatException e) { return Integer.parseInt(DEFAULTS.getOrDefault(key, "0")); }
    }

    @Transactional
    public void set(String key, String value) {
        if (value == null) return;
        AssociationGroup group = activeGroup();
        if (group != null) {
            switch (key) {
                case ORG_NAME -> group.setName(value.trim()); case ORG_LOGO -> group.setLogoUrl(value.trim());
                case ORG_PRIMARY -> group.setPrimaryColor(value.trim()); case ORG_ACCENT -> group.setAccentColor(value.trim());
                case ORG_CURRENCY -> group.setCurrency(value.trim()); case RULES_MIN -> group.setMinAssistancesRequired(Math.max(0, Integer.parseInt(value.trim())));
                case RULES_MIN_AMOUNT -> {
                    BigDecimal amount = new BigDecimal(value.trim());
                    if (amount.signum() < 0) throw cm.makenene.solidarite.config.ApiException.badRequest("Le montant minimum ne peut pas être négatif.");
                    group.setMinContributionAmount(amount);
                }
                case ORG_PHONE -> group.setContactPhone(value.trim()); case ORG_EMAIL -> group.setContactEmail(value.trim());
                default -> repository.save(AppSetting.builder().key(key).value(value.trim()).build());
            }
            groups.save(group);
            return;
        }
        repository.save(AppSetting.builder().key(key).value(value.trim()).build());
    }

    public Map<String, String> all() {
        Map<String, String> map = new LinkedHashMap<>(DEFAULTS);
        repository.findAll().forEach(s -> map.put(s.getKey(), s.getValue()));
        return map;
    }

    public SettingDtos.PublicSettings publicSettings() {
        return new SettingDtos.PublicSettings(get(ORG_NAME), get(ORG_LOGO), get(ORG_PRIMARY), get(ORG_ACCENT),
                get(ORG_CURRENCY), get(DEFAULT_LOCALE), new BigDecimal(get(RULES_MIN_AMOUNT)));
    }

    public SettingDtos.PublicSettings publicSettings(Long groupId) {
        if (groupId == null) return publicSettings();
        AssociationGroup group = groups.findById(groupId).filter(AssociationGroup::isActive).orElseThrow(() -> cm.makenene.solidarite.config.ApiException.notFound("Groupe introuvable"));
        return new SettingDtos.PublicSettings(group.getName(), group.getLogoUrl(), group.getPrimaryColor(), group.getAccentColor(), group.getCurrency(), get(DEFAULT_LOCALE), group.getMinContributionAmount());
    }

    public SettingDtos.SettingsView view() {
        Map<String, String> raw = all();
        if (!currentUser.isSuperAdmin()) raw.remove(DEFAULT_PASSWORD);
        return new SettingDtos.SettingsView(get(ORG_NAME), get(ORG_LOGO), get(ORG_PRIMARY), get(ORG_ACCENT),
                get(ORG_CURRENCY), getInt(RULES_MIN), get(DEFAULT_LOCALE), get(DEFAULT_THEME),
                currentUser.isSuperAdmin() ? get(DEFAULT_PASSWORD) : "", get(ORG_PHONE), get(ORG_EMAIL), get(ORG_MOTTO), raw, new BigDecimal(get(RULES_MIN_AMOUNT)));
    }

    @Transactional
    public SettingDtos.SettingsView update(SettingDtos.SettingsUpdateRequest r) {
        set(ORG_NAME, r.orgName());
        set(ORG_LOGO, r.logoUrl());
        set(ORG_PRIMARY, r.primaryColor());
        set(ORG_ACCENT, r.accentColor());
        set(ORG_CURRENCY, r.currency());
        set(ORG_MOTTO, r.motto());
        set(ORG_PHONE, r.contactPhone());
        set(ORG_EMAIL, r.contactEmail());
        if (r.minContributionsRequired() != null) set(RULES_MIN, String.valueOf(Math.max(0, r.minContributionsRequired())));
        if (r.minContributionAmount() != null) set(RULES_MIN_AMOUNT, r.minContributionAmount().toPlainString());
        if (currentUser.isSuperAdmin()) {
            set(DEFAULT_LOCALE, r.defaultLocale());
            set(DEFAULT_THEME, r.defaultTheme());
            set(DEFAULT_PASSWORD, r.defaultPassword());
        }
        return view();
    }
}
