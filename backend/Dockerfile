FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY backend/gradle gradle
COPY backend/gradlew backend/build.gradle.kts backend/settings.gradle.kts ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon
COPY backend/src src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
