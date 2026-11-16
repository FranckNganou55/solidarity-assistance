# --- build ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# --- run ---
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/solidarite-api-1.0.0.jar app.jar
ENV SPRING_PROFILES_ACTIVE=postgres
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
