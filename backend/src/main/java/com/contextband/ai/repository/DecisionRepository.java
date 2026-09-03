package com.contextband.ai.repository;

import com.contextband.ai.entity.Decision;
import com.contextband.ai.config.enums.DecisionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DecisionRepository extends JpaRepository<Decision, Long> {
    List<Decision> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Decision> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, DecisionStatus status);
    Optional<Decision> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, DecisionStatus status);
    List<Decision> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
}
