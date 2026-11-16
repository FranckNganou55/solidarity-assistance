-- Keep the platform super administrator as a real member in every active group.
-- Global permissions remain controlled by the super_admin flag.
INSERT INTO group_members (
    group_id, member_id, role_id, is_principal_admin, active,
    cycle_contributions, total_contributions, required_assistances_override,
    bureau_position, joined_at
)
SELECT g.id, m.id, r.id, FALSE, TRUE, 0, 0, NULL, NULL, now()
FROM association_groups g
JOIN members m ON m.super_admin = TRUE AND m.active = TRUE
JOIN roles r ON r.group_id = g.id AND r.code = 'MEMBRE'
WHERE g.active = TRUE
ON CONFLICT (group_id, member_id) DO NOTHING;
