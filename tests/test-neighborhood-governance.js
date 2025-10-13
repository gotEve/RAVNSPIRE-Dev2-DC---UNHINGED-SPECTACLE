const Database = require('../database/db');
const neighborhoodGovernanceManager = require('../utils/neighborhoodGovernanceManager');

async function testNeighborhoodGovernance() {
    try {
        console.log('🧪 Testing Neighborhood Governance System...\n');

        // Test 1: Create test guilds
        console.log('1. Creating test guilds...');
        await Database.query(`
            INSERT OR IGNORE INTO guilds (name, description, owner_id)
            VALUES ('Test Guild 1', 'Test guild for governance testing', 111111111111),
                   ('Test Guild 2', 'Another test guild', 222222222222)
        `);

        const guilds = await Database.query('SELECT * FROM guilds WHERE name LIKE "Test Guild%"');
        console.log(`✅ Created ${guilds.rows.length} test guilds`);

        // Test 2: Create a proposal
        console.log('\n2. Testing createProposal...');
        const proposalResult = await neighborhoodGovernanceManager.createProposal(
            1, // neighborhood_id
            guilds.rows[0].id, // proposer_guild_id
            'Test Building Proposal',
            'This is a test proposal to build a community center',
            'building',
            JSON.stringify({ buildingType: 'community_center', cost: 5000 })
        );
        console.log(`✅ Created proposal #${proposalResult.proposalId}`);

        // Test 3: Get active proposals
        console.log('\n3. Testing getActiveProposals...');
        const activeProposals = await neighborhoodGovernanceManager.getActiveProposals(1);
        console.log(`✅ Found ${activeProposals.length} active proposal(s)`);

        // Test 4: Cast votes
        console.log('\n4. Testing castVote...');
        // Get the actual proposal ID from the database
        const latestProposal = await Database.query('SELECT id FROM neighborhood_proposals ORDER BY id DESC LIMIT 1');
        const proposalId = latestProposal.rows[0].id;
        
        const vote1 = await neighborhoodGovernanceManager.castVote(
            proposalId,
            guilds.rows[0].id,
            'for'
        );
        console.log(`✅ Guild 1 voted: ${vote1.voteType}`);

        const vote2 = await neighborhoodGovernanceManager.castVote(
            proposalId,
            guilds.rows[1].id,
            'against'
        );
        console.log(`✅ Guild 2 voted: ${vote2.voteType}`);

        // Test 5: Get proposal details
        console.log('\n5. Testing getProposalDetails...');
        const proposalDetails = await neighborhoodGovernanceManager.getProposalDetails(proposalId);
        console.log(`✅ Retrieved proposal details with ${proposalDetails.votes.length} votes`);

        // Test 6: Check if guild has voted
        console.log('\n6. Testing hasGuildVoted...');
        const hasVoted1 = await neighborhoodGovernanceManager.hasGuildVoted(proposalId, guilds.rows[0].id);
        const hasVoted2 = await neighborhoodGovernanceManager.hasGuildVoted(proposalId, guilds.rows[1].id);
        console.log(`✅ Guild 1 has voted: ${hasVoted1}, Guild 2 has voted: ${hasVoted2}`);

        // Test 7: Get eligible voters
        console.log('\n7. Testing getEligibleVoters...');
        const eligibleVoters = await neighborhoodGovernanceManager.getEligibleVoters(1);
        console.log(`✅ Found ${eligibleVoters.length} eligible voters`);

        // Test 8: Get proposal statistics
        console.log('\n8. Testing getProposalStats...');
        const stats = await neighborhoodGovernanceManager.getProposalStats(1);
        console.log(`✅ Proposal stats: ${stats.total_proposals} total, ${stats.active_proposals} active`);

        // Test 9: Create a policy proposal
        console.log('\n9. Testing policy proposal...');
        const policyProposal = await neighborhoodGovernanceManager.createProposal(
            1,
            guilds.rows[1].id,
            'Test Policy Proposal',
            'This is a test policy proposal',
            'policy',
            JSON.stringify({ ruleType: 'quiet_hours', ruleValue: '10pm-6am' })
        );
        console.log(`✅ Created policy proposal #${policyProposal.proposalId}`);

        // Test 10: Get all proposals
        console.log('\n10. Testing getAllProposals...');
        const allProposals = await neighborhoodGovernanceManager.getAllProposals(1);
        console.log(`✅ Found ${allProposals.length} total proposal(s)`);

        console.log('\n✅ All neighborhood governance tests passed!');
        console.log('\n📊 Test Summary:');
        console.log(`- Test guilds created: ${guilds.rows.length}`);
        console.log(`- Proposals created: 2`);
        console.log(`- Votes cast: 2`);
        console.log(`- Active proposals: ${activeProposals.length}`);
        console.log(`- Eligible voters: ${eligibleVoters.length}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testNeighborhoodGovernance();
