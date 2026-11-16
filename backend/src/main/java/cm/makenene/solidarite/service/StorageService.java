package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class StorageService {

    private static final Set<String> ALLOWED_IMAGES = Set.of("png", "jpg", "jpeg", "webp", "svg");
    private static final Set<String> ALLOWED_DOCUMENTS = Set.of("png", "jpg", "jpeg", "webp", "pdf", "doc", "docx");

    private final Path root;

    public StorageService(@Value("${app.upload-dir:./data/uploads}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath();
        try { Files.createDirectories(root); } catch (IOException ignored) {}
    }

    public String store(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Fichier vide");
        String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        boolean document = "doc".equals(prefix);
        if (!(document ? ALLOWED_DOCUMENTS : ALLOWED_IMAGES).contains(ext))
            throw ApiException.badRequest(document ? "Format non supporte (PDF, DOCX, JPG ou PNG)" : "Format non supporte (png, jpg, webp, svg)");
        long maxBytes = document ? 5L * 1024 * 1024 : 2L * 1024 * 1024;
        if (file.getSize() > maxBytes) throw ApiException.badRequest(document ? "Fichier trop volumineux (max 5 Mo)" : "Fichier trop volumineux (max 2 Mo)");
        String name = prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "." + ext;
        try {
            Files.copy(file.getInputStream(), root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw ApiException.badRequest("Impossible d'enregistrer le fichier : " + e.getMessage());
        }
        return "/uploads/" + name;
    }
}
