package com.contextband.ai.repository;

import com.contextband.ai.entity.ContextEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContextRepository extends JpaRepository<ContextEvent, Long> {
    List<ContextEvent> findByUserIdOrderByRecordedAtDesc(Long userId);
    List<ContextEvent> findTop5ByUserIdOrderByRecordedAtDesc(Long userId);
    List<ContextEvent> findByUserIdAndLocationCategoryOrderByRecordedAtDesc(Long userId, String locationCategory);
}
