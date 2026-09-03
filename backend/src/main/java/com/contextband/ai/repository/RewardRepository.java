package com.contextband.ai.repository;

import com.contextband.ai.entity.Reward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RewardRepository extends JpaRepository<Reward, Long> {
    List<Reward> findByUserIdOrderByRespondedAtDesc(Long userId);
    List<Reward> findByDecisionId(Long decisionId);
    Optional<Reward> findByDecisionIdAndUserId(Long decisionId, Long userId);

    @Query("SELECT AVG(r.rewardValue) FROM Reward r WHERE r.user.id = :userId")
    Double getAverageRewardByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM Reward r WHERE r.user.id = :userId AND r.response = 'COMPLETE'")
    Long countCompletedByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM Reward r WHERE r.user.id = :userId")
    Long countTotalByUserId(@Param("userId") Long userId);
}
