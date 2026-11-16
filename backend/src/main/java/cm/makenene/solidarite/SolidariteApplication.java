package cm.makenene.solidarite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SolidariteApplication {
    public static void main(String[] args) {
        SpringApplication.run(SolidariteApplication.class, args);
    }
}
