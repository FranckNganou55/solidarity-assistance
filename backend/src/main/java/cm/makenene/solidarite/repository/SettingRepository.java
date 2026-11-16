package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingRepository extends JpaRepository<AppSetting, String> {
}
