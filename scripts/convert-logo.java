import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;

class ConvertLogo {
    public static void main(String[] args) throws Exception {
        BufferedImage logo = ImageIO.read(Path.of(args[0]).toFile());
        if (logo == null) throw new IllegalArgumentException("Le logo source est illisible.");
        for (int i = 1; i < args.length; i++) {
            Path target = Path.of(args[i]);
            Files.createDirectories(target.getParent());
            if (!ImageIO.write(logo, "png", target.toFile())) {
                throw new IllegalStateException("Écriture PNG indisponible.");
            }
            System.out.println(target + " — " + logo.getWidth() + " × " + logo.getHeight());
        }
    }
}
