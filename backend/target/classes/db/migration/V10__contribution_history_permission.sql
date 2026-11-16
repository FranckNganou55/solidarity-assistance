INSERT INTO role_permissions(role_id, permission)
SELECT role_id, 'CONTRIBUTION_VIEW'
FROM role_permissions
WHERE permission = 'CONTRIBUTION_SUBMIT'
ON CONFLICT DO NOTHING;
