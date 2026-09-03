package com.contextband.ai.repository;

import com.contextband.ai.entity.Intervention;
import com.contextband.ai.config.enums.InterventionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterventionRepository extends JpaRepository<Intervention, Long> {
    List<Intervention> findByActiveTrue();

    List<Intervention> findByActiveTrueAndType(InterventionType type);

    @Query("SELECT i FROM Intervention i WHERE i.active = true AND (i.suitableTimeOfDay = :timeOfDay OR i.suitableTimeOfDay IS NULL)")
    List<Intervention> findSuitableForTimeOfDay(@Param("timeOfDay") String timeOfDay);
}
