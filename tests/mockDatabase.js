// Mock database for testing
class MockDatabase {
    constructor() {
        this.data = {
            users: new Map(),
            security_flags: [],
            user_security: new Map(),
            game_audit_log: [],
            user_penalties: []
        };
    }

    async query(sql, params = []) {
        // Mock query execution
        if (sql.includes('INSERT INTO security_flags')) {
            this.data.security_flags.push({
                user_id: params[0],
                flag_type: params[1],
                data: params[2],
                severity: params[3],
                created_at: params[4]
            });
            return { rows: [{ id: 1 }], rowCount: 1 };
        }
        
        if (sql.includes('INSERT INTO user_security')) {
            this.data.user_security.set(params[0], {
                user_id: params[0],
                status: params[1],
                restrictions: params[2]
            });
            return { rows: [{ id: 1 }], rowCount: 1 };
        }
        
        if (sql.includes('INSERT INTO user_penalties')) {
            this.data.user_penalties.push({
                user_id: params[0],
                penalty_type: params[1],
                reason: params[2],
                applied_at: params[3],
                expires_at: params[4],
                data: params[5]
            });
            return { rows: [{ id: 1 }], rowCount: 1 };
        }
        
        if (sql.includes('INSERT INTO game_audit_log')) {
            this.data.game_audit_log.push({
                user_id: params[0],
                action: params[1],
                data: params[2]
            });
            return { rows: [{ id: 1 }], rowCount: 1 };
        }
        
        if (sql.includes('INSERT INTO users')) {
            this.data.users.set(params[0], {
                discord_id: params[0],
                username: params[1],
                global_xp: 0,
                currency: 0,
                join_date: new Date(),
                last_active: new Date()
            });
            return { rows: [{ discord_id: params[0], username: params[1] }], rowCount: 1 };
        }
        
        if (sql.includes('SELECT * FROM users WHERE discord_id')) {
            const user = this.data.users.get(params[0]);
            return { rows: user ? [user] : [] };
        }
        
        if (sql.includes('SELECT username FROM users WHERE username ILIKE')) {
            // Mock similar username search
            return { rows: [] };
        }
        
        if (sql.includes('SELECT COUNT(*) as count FROM users')) {
            return { rows: [{ count: '0' }] };
        }
        
        if (sql.includes('SELECT restrictions FROM user_security')) {
            const userSecurity = this.data.user_security.get(params[0]);
            return { rows: userSecurity ? [{ restrictions: userSecurity.restrictions }] : [] };
        }
        
        if (sql.includes('UPDATE user_security')) {
            return { rows: [], rowCount: 1 };
        }
        
        // Default response
        return { rows: [], rowCount: 0 };
    }

    async getClient() {
        return {
            query: (sql, params) => this.query(sql, params),
            release: () => {}
        };
    }

    async close() {
        // Mock close
    }
}

module.exports = MockDatabase;
