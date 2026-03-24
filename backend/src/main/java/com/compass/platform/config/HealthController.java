package com.compass.platform.config;

import com.compass.platform.shared.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.beans.factory.annotation.Value;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @Value("${spring.application.version:dev}")
    private String version;

    @GetMapping("/health")
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.of(Map.of("status", "UP", "version", version));
    }
}
