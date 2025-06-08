import org.jetbrains.kotlin.gradle.dsl.KotlinJsProjectExtension

plugins {
    kotlin("js") version "1.9.0" // Or the latest stable version
}

group = "com.example"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

kotlin {
    js(IR) { // Use IR compiler
        browser {
            commonWebpackConfig {
                cssSupport.enabled = true
            }
            distribution {
                directory = File("$buildDir/distributions")
            }
        }
        binaries.executable()
    }
}

dependencies {
    implementation(kotlin("stdlib-js"))
    implementation("org.jetbrains.kotlinx:kotlinx-browser:0.0.1-SNAPSHOT") // Check for latest version
    // For kotlinx.html if needed for typed HTML building:
    // implementation("org.jetbrains.kotlinx:kotlinx-html-js:0.8.0") // Check for latest version
}

// Ensure the wrapper task for browser support is available
tasks.withType<org.jetbrains.kotlin.gradle.targets.js.npm.tasks.KotlinNpmInstallTask> {
    args += "--ignore-scripts"
}

// Optional: Configure Kotlin version for the project
kotlinProject.sourceSets.all {
    languageSettings.apply {
        // languageVersion = "1.9" // Example
        // apiVersion = "1.9" // Example
    }
}
