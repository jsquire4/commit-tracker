package com.st6.committracker.shared;

import java.util.UUID;

public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String entityType, UUID id) {
        super(entityType + " not found: " + id);
    }
}
