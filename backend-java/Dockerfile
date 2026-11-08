FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S factoryhub \
    && adduser -S factoryhub -G factoryhub
WORKDIR /app
COPY --from=build /workspace/target/factoryhub-backend.jar ./app.jar
USER factoryhub
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=4s --start-period=20s --retries=3 \
  CMD curl --fail --silent http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
