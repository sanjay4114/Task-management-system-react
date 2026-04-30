# Build stage using Java 21
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy project files
COPY . .

# Build the application
RUN ./mvnw clean package -DskipTests

# Run stage using Java 21
FROM eclipse-temurin:21-jdk

WORKDIR /app

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]