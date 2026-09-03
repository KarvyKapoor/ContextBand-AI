package com.contextband.ai.repository;

import com.contextband.ai.entity.PolicyWeight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PolicyWeightRepository extends JpaRepository<PolicyWeight, Long> {

    Optional<PolicyWeight> findByUserIdAndInterventionIdAndContextSignature(
            Long userId, Long interventionId, String contextSignature);

    List<PolicyWeight> findByUserIdAndContextSignatureOrderByWeightDesc(
            Long userId, String contextSignature);

    List<PolicyWeight> findByUserIdOrderByWeightDesc(Long userId);

    List<PolicyWeight> findByUserIdAndInterventionId(Long userId, Long interventionId);
}
