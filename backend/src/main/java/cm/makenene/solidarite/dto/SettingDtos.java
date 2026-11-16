package cm.makenene.solidarite.dto;

import java.util.Map;
import java.math.BigDecimal;

public class SettingDtos {

    /** Parametres publics (utilises par l'ecran de connexion : nom + logo + couleurs). */
    public record PublicSettings(String orgName, String logoUrl, String primaryColor, String accentColor,
                                 String currency, String defaultLocale, BigDecimal minContributionAmount) {}

    public record SettingsView(String orgName, String logoUrl, String primaryColor, String accentColor,
                               String currency, int minContributionsRequired, String defaultLocale,
                               String defaultTheme, String defaultPassword, String contactPhone,
                               String contactEmail, String motto, Map<String, String> raw, BigDecimal minContributionAmount) {}

    public record SettingsUpdateRequest(String orgName, String logoUrl, String primaryColor, String accentColor,
                                        String currency, Integer minContributionsRequired, String defaultLocale,
                                        String defaultTheme, String defaultPassword, String contactPhone,
                                        String contactEmail, String motto, BigDecimal minContributionAmount) {}
}
