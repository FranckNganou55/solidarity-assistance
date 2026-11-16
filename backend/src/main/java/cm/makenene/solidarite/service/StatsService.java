package cm.makenene.solidarite.service;

import cm.makenene.solidarite.domain.ContributionStatus;
import cm.makenene.solidarite.domain.EventStatus;
import cm.makenene.solidarite.domain.RequestStatus;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class StatsService {

    private final MemberRepository memberRepository;
    private final EventRepository eventRepository;
    private final ContributionRepository contributionRepository;
    private final RequestRepository requestRepository;
    private final TypeService typeService;
    private final GroupMembershipRepository memberships;
    private final CurrentUser currentUser;

    public StatsService(MemberRepository memberRepository, EventRepository eventRepository,
                        ContributionRepository contributionRepository, RequestRepository requestRepository,
                        TypeService typeService, GroupMembershipRepository memberships, CurrentUser currentUser) {
        this.memberRepository = memberRepository;
        this.eventRepository = eventRepository;
        this.contributionRepository = contributionRepository;
        this.requestRepository = requestRepository;
        this.typeService = typeService;
        this.memberships = memberships;
        this.currentUser = currentUser;
    }

    public Map<String, Object> dashboard() {
        Map<String, Object> map = new LinkedHashMap<>();
        Long groupId = currentUser.requireGroupId();
        map.put("members", memberships.countByGroupId(groupId));
        map.put("activeMembers", memberships.countByGroupIdAndActiveTrue(groupId));
        map.put("openEvents", eventRepository.countByGroupIdAndStatus(groupId, EventStatus.OPEN));
        map.put("closedEvents", eventRepository.countByGroupIdAndStatus(groupId, EventStatus.CLOSED));
        map.put("completedEvents", eventRepository.countByGroupIdAndStatus(groupId, EventStatus.CLOSED));
        map.put("cancelledEvents", eventRepository.countByGroupIdAndStatus(groupId, EventStatus.CANCELLED));
        map.put("pendingContributions", contributionRepository.findAllByEventGroupAndStatus(groupId, ContributionStatus.PENDING).size());
        map.put("validatedContributions", contributionRepository.findAllByEventGroupAndStatus(groupId, ContributionStatus.VALIDATED).size());
        map.put("pendingRequests", requestRepository.countByGroupIdAndStatus(groupId, RequestStatus.PENDING));
        map.put("totalCollected", contributionRepository.sumValidatedByGroup(groupId));
        map.put("assistanceTypes", typeService.findAll(null).size());
        map.put("contributionsByType", contributionRepository.findAllByEventGroup(groupId).stream()
                .filter(c -> c.getStatus() == ContributionStatus.VALIDATED)
                .collect(Collectors.groupingBy(c -> c.getEvent().getType().getName(),
                        LinkedHashMap::new,
                        Collectors.reducing(BigDecimal.ZERO, c -> c.getAmount(), BigDecimal::add))));
        var months = new ArrayList<YearMonth>();
        var firstMonth = YearMonth.now().minusMonths(5);
        for (int i = 0; i < 6; i++) months.add(firstMonth.plusMonths(i));
        var formatter = DateTimeFormatter.ofPattern("MMM yy", Locale.FRENCH);
        Map<YearMonth, BigDecimal> contributionsByMonth = new java.util.LinkedHashMap<>();
        Map<YearMonth, Long> assistancesByMonth = new java.util.LinkedHashMap<>();
        months.forEach(month -> { contributionsByMonth.put(month, BigDecimal.ZERO); assistancesByMonth.put(month, 0L); });
        contributionRepository.findAllByEventGroup(groupId).stream()
                .filter(c -> c.getStatus() == ContributionStatus.VALIDATED && c.getValidatedAt() != null)
                .forEach(c -> {
                    YearMonth month = YearMonth.from(c.getValidatedAt().atZone(ZoneId.systemDefault()));
                    if (contributionsByMonth.containsKey(month)) contributionsByMonth.merge(month, c.getAmount(), BigDecimal::add);
                });
        eventRepository.findAllByGroupId(groupId).stream()
                .filter(e -> e.getStatus() == EventStatus.CLOSED && e.getClosedAt() != null)
                .forEach(e -> {
                    YearMonth month = YearMonth.from(e.getClosedAt().atZone(ZoneId.systemDefault()));
                    if (assistancesByMonth.containsKey(month)) assistancesByMonth.merge(month, 1L, Long::sum);
                });
        map.put("monthlyContributions", months.stream().map(month -> Map.of("period", month.format(formatter), "value", contributionsByMonth.get(month))).toList());
        map.put("monthlyAssistances", months.stream().map(month -> Map.of("period", month.format(formatter), "value", assistancesByMonth.get(month))).toList());
        return map;
    }
}
