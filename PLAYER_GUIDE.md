# Ravnspire Multi-Game Community Bot - Player Guide

## 🎮 **WELCOME TO RAVNSPIRE**

Welcome to Ravnspire, a comprehensive social simulation Discord bot where you can play games, build relationships, manage factions, and create lasting legacies through generations of characters. This guide will help you get started and master all the features available.

## 🚀 **GETTING STARTED**

### **First Steps**
1. **Create Your Character**: Use `/faction create` to create your first character
2. **Choose Your Faction**: Select from Human, AI, or Nature factions
3. **Play Your First Game**: Use `/games list` to see available games
4. **Join a Guild**: Use `/guild join` to become part of a community
5. **Explore the World**: Use `/lore search` to discover the rich lore of Ravnspire

### **Basic Commands**
- `/help` - Get help and navigate the bot's features
- `/profile view` - View your character profile and statistics
- `/games list` - See all available games
- `/faction view` - Check your faction and character information

## 🎯 **GAME SYSTEM**

### **Available Games**

#### **Trivia Game**
- **How to Play**: Answer questions from various categories
- **Categories**: History, Science, Entertainment, Geography, and more
- **Difficulty Levels**: Easy, Medium, Hard
- **Rewards**: XP, currency, and faction-specific resources

#### **Tetris Game**
- **How to Play**: Classic falling blocks puzzle game
- **Controls**: Use buttons to move and rotate pieces
- **Scoring**: Clear lines to earn points and advance levels
- **Features**: Auto-drop, level progression, high score tracking

#### **Tic Tac Toe Game**
- **How to Play**: Strategic 3x3 grid game
- **Modes**: Play against AI or challenge other players
- **Strategy**: Get three in a row to win
- **Features**: Multiplayer support, AI opponent, game history

### **Game Commands**
- `/games list` - View all available games
- `/games play [game]` - Start playing a specific game
- `/games leaderboard [game]` - View game leaderboards
- `/games stats [game]` - View your game statistics

### **Rewards System**
- **Base Rewards**: Every game completion gives XP and currency
- **Faction Resources**: Your faction determines which resources you earn
- **Multipliers**: Various bonuses can increase your rewards:
  - **Speed Bonus**: Complete games quickly for extra rewards
  - **Accuracy Bonus**: High scores and perfect games give bonuses
  - **Streak Bonus**: Consecutive wins provide increasing bonuses
  - **Variety Bonus**: Playing different games increases all rewards
  - **Guild Bonus**: Guild membership provides small bonuses
  - **Plot Bonus**: Owning plots gives additional bonuses

## 👥 **FACTION SYSTEM**

### **Faction Types**

#### **Human Faction**
- **Resources**: Food and Water
- **Focus**: Community building and social interaction
- **Specialties**: Guild activities and neighborhood participation
- **Philosophy**: Unity and cooperation

#### **AI Faction**
- **Resources**: Energy and Data Fragments
- **Focus**: Technology and efficiency
- **Specialties**: Game optimization and strategic planning
- **Philosophy**: Progress and innovation

#### **Nature Faction**
- **Resources**: Biomass and Organic Matter
- **Focus**: Growth and sustainability
- **Specialties**: Long-term planning and resource management
- **Philosophy**: Harmony and balance

### **Character Management**
- **Character Creation**: Create multiple characters with different factions
- **Character Switching**: Switch between your characters (permanent for children)
- **Lineage Tracking**: Your characters can have parents and children
- **Faction Purity**: Track how "pure" your faction alignment is

### **Faction Commands**
- `/faction create [name] [faction]` - Create a new character
- `/faction switch [character_id]` - Switch to a different character
- `/faction view [user]` - View faction information
- `/faction history` - View your faction change history

## 💕 **MARRIAGE & FAMILY SYSTEM**

### **Marriage System**

#### **Marriage Types**
- **Dyad**: Traditional two-person marriage
- **Triad**: Three-person polyamorous relationship
- **Quad**: Four-person polyamorous relationship

#### **Marriage Process**
1. **Proposal**: Use `/marriage propose [user] [type] [message]` to propose
2. **Response**: The target can accept or reject the proposal
3. **Wedding**: Once accepted, you're married and can start building affection
4. **Marriage Status**: Use `/marriage status` to view your marriage information

### **Affection System**
- **Building Affection**: Interact with your spouse(s) to build affection points
- **Interaction Types**:
  - **Conversation**: Simple chat interactions
  - **Gifts**: Give gifts to show appreciation
  - **Dates**: Special romantic activities
  - **Games**: Play games together
  - **Care**: Take care of each other

### **Child System**

#### **Conception**
- **Requirements**: High affection points and sufficient resources
- **Methods**: Natural, surrogate, or artificial conception
- **Hybrid Children**: Children can inherit traits from multiple factions

#### **Child Development**
- **Care Requirements**: Daily care to ensure healthy development
- **Development Stats**: Intelligence, Creativity, Resilience, Social Skills
- **Neglect Consequences**: Neglected children may have poor development
- **Character Switching**: Switch to adult children for generational gameplay

### **Family Commands**
- `/marriage propose [user] [type] [message]` - Propose marriage
- `/marriage accept [proposal_id]` - Accept marriage proposal
- `/marriage status` - View marriage information
- `/affection interact [partner] [type] [message]` - Build affection
- `/children attempt [partner] [method]` - Attempt conception
- `/children care [child_id] [type] [quality]` - Care for child
- `/children status [child_id]` - View child development

## 🏰 **GUILD DISTRICT**

### **Commercial Plots**
- **Plot Sizes**: Small, Medium, Large, Commercial Estate
- **Plot Tiers**: Upgrade plots to increase their value and capabilities
- **Building Types**:
  - **Resource Mines**: Generate faction-specific resources
  - **Training Grounds**: Provide XP bonuses for guild members
  - **Vaults**: Store and protect guild resources
  - **Command Centers**: Administrative and coordination hubs
  - **Workshops**: Crafting and enhancement facilities

### **Resource Generation**
- **Automated Production**: Buildings generate resources over time
- **Collection**: Guild members can collect generated resources
- **Upgrades**: Higher tier buildings generate more resources
- **Maintenance**: Regular upkeep required to maintain buildings

### **Guild District Commands**
- `/guild-district buy-plot [size]` - Purchase a plot
- `/guild-district upgrade-plot [plot_id]` - Upgrade plot tier
- `/guild-district build [plot_id] [building_type]` - Construct building
- `/guild-district collect [plot_id]` - Collect generated resources
- `/guild-district info` - View guild's district holdings

## ⚔️ **ARENA/CRUCIBLE**

### **Practice Grounds**
- **Daily Practice**: Up to 5 practice sessions per day
- **XP Rewards**: 25 XP per session (no other rewards)
- **Purpose**: Skill improvement without resource farming
- **Games**: Practice any available game type

### **Competitions**

#### **Competition Types**
- **Individual PvP**: One-on-one player competitions
- **Guild PvP**: Guild versus guild battles
- **Tournament**: Multi-round elimination competitions
- **Boss Raids**: Server-wide cooperative events

#### **Competition Process**
1. **Join**: Use `/crucible join [competition_id]` to join
2. **Compete**: Play games to earn points
3. **Results**: Winners receive rewards and recognition
4. **Leaderboards**: Track your performance over time

### **Boss Raids**
- **Server-Wide Events**: All players can participate
- **Cooperative Gameplay**: Work together to defeat powerful bosses
- **Damage Tracking**: Your damage contribution is tracked
- **Rewards**: Special rewards for top contributors

### **Arena Commands**
- `/crucible practice [game]` - Practice for XP
- `/crucible join [competition_id]` - Join competition
- `/crucible leaderboard [type] [game]` - View leaderboards
- `/crucible schedule` - View upcoming events
- `/crucible status` - View your arena statistics

## 🏆 **ACHIEVEMENT SYSTEM**

### **Achievement Categories**

#### **Marriage Milestones**
- **First Love**: Get married for the first time
- **Golden Anniversary**: Stay married for 30 days
- **Polyamory Pioneer**: Be in a polyamorous relationship

#### **Parenting Achievements**
- **New Parent**: Have your first child
- **Family Builder**: Raise 3 children to adulthood
- **Dynasty Founder**: Create a 5-generation lineage

#### **Arena Achievements**
- **Practice Master**: Complete 100 practice sessions
- **Arena Champion**: Win 50 competitions
- **Boss Slayer**: Deal 10,000 damage in boss raids

#### **Faction Achievements**
- **Human Purist**: Maintain 100% Human faction purity
- **AI Ascended**: Achieve perfect AI alignment
- **Nature's Chosen**: Master Nature faction gameplay
- **Hybrid Master**: Experience all three factions through children

### **Reward Types**
- **XP**: Experience points for character progression
- **Titles**: Special display names for your profile
- **Badges**: Visual indicators of your achievements
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary

### **Achievement Commands**
- `/achievements view [category]` - View achievements
- `/achievements progress [achievement_id]` - Check progress
- `/achievements recent` - View recently earned achievements

## 🏘️ **NEIGHBORHOOD & HOUSING SYSTEM**

### **Residential Plots**

#### **Plot Sizes and Costs**
- **Small Plot**: 1,000 currency - 2 occupants max
- **Medium Plot**: 2,500 currency - 4 occupants max  
- **Large Plot**: 5,000 currency - 6 occupants max
- **Estate Plot**: 10,000 currency - 10 occupants max

#### **Plot Management**
- **Purchase Plots**: Use `/plot buy` to purchase residential plots
- **Upgrade Tiers**: Improve your plot with `/plot upgrade` (5 tiers available)
- **List for Sale**: Sell your plot with `/plot sell`
- **Buy from Others**: Purchase plots listed for sale with `/plot buy-sale`

#### **Co-habitation System**
- **Invite Roommates**: Use `/plot invite` to invite other characters
- **Set Rent**: Optional monthly rent for roommates
- **Occupancy Types**: Owner, renter, roommate, child
- **View Occupants**: See who lives in your plot with `/plot info`

#### **Plot Commands**
- `/plot buy [neighborhood_id] [plot_number] [size]` - Purchase a plot
- `/plot sell [plot_id] [price]` - List plot for sale
- `/plot buy-sale [plot_id]` - Buy a plot that's for sale
- `/plot upgrade [plot_id]` - Upgrade plot tier
- `/plot invite [plot_id] [user] [rent]` - Invite occupant
- `/plot info [plot_id]` - View plot details
- `/plot my-plots` - View your owned plots
- `/plot available [neighborhood_id]` - View available plots
- `/plot neighborhoods` - View all neighborhoods

### **Neighborhoods**

#### **Available Neighborhoods**
- **Sunrise Valley**: Peaceful residential area with beautiful gardens
- **Moonlight District**: Upscale neighborhood with luxury homes
- **Garden Grove**: Family-friendly community with parks and schools
- **Tech Heights**: Modern residential area near AI faction headquarters
- **Nature's Rest**: Eco-friendly neighborhood surrounded by natural beauty

#### **Neighborhood Features**
- **Defense Levels**: Different neighborhoods have varying defense capabilities
- **Community Buildings**: Shared facilities and amenities
- **Governance**: Participate in neighborhood decisions and voting

### **Neighborhood Governance**

#### **Proposal System**
- **Proposal Types**: 6 types with different voting periods
  - **Building**: Community building construction (7 days)
  - **Policy**: Neighborhood policy changes (5 days)
  - **Event**: Community events and activities (3 days)
  - **Defense**: Defense system improvements (2 days)
  - **Tax**: Tax rate adjustments (10 days)
  - **Amenity**: New amenities or services (7 days)

#### **Voting System**
- **Guild-based Voting**: Only guilds with neighborhood plots can vote
- **One Vote Per Guild**: Each guild gets one vote per proposal
- **For/Against**: Simple binary voting system
- **Automatic Processing**: Expired proposals are automatically processed

#### **Governance Commands**
- `/neighborhood propose [neighborhood_id] [title] [description] [type]` - Create proposal
- `/neighborhood vote [proposal_id] [for/against]` - Cast vote
- `/neighborhood proposals [neighborhood_id]` - View active proposals
- `/neighborhood proposal [proposal_id]` - View detailed proposal
- `/neighborhood rules [neighborhood_id]` - View neighborhood rules
- `/neighborhood stats [neighborhood_id]` - View governance statistics
- `/neighborhood voters [neighborhood_id]` - View eligible voters

### **Neighborhood Commands**
- `/neighborhood view [name]` - View neighborhood information
- `/neighborhood join [name]` - Join a neighborhood
- `/neighborhood propose [type] [value]` - Create proposal
- `/neighborhood vote [proposal_id] [for/against]` - Vote on proposal

## 💰 **RESOURCE ECONOMY SYSTEM**

### **Faction-Specific Resources**

#### **Human Faction**
- **Food**: 10 per day consumption
- **Water**: 5 per day consumption
- **Currency**: Universal resource for trading
- **Building Materials**: For construction and upgrades
- **Rare Artifacts**: Valuable collectibles

#### **AI Faction**
- **Energy**: 8 per day consumption
- **Data Fragments**: 3 per day consumption
- **Electricity**: 5 per day consumption
- **Currency**: Universal resource for trading
- **Building Materials**: For construction and upgrades
- **Rare Artifacts**: Valuable collectibles

#### **Nature Faction**
- **Biomass**: 12 per day consumption
- **Organic Matter**: 6 per day consumption
- **Currency**: Universal resource for trading
- **Building Materials**: For construction and upgrades
- **Rare Artifacts**: Valuable collectibles

### **Resource Management**
- **Daily Consumption**: Resources are automatically deducted daily based on your faction
- **Resource Validation**: The system prevents you from spending more resources than you have
- **Resource History**: Track your consumption patterns and resource usage over time
- **Value Calculation**: Resources have different values for trading and display purposes

### **Resource Commands**
- `/resources view [user]` - View current resources and daily costs
- `/resources daily` - Process daily resource consumption manually
- `/resources history [days]` - View your consumption history
- `/resources faction [faction]` - View faction-specific resource information
- `/resources admin [confirm]` - Process all daily consumption (admin only)

### **Resource Tips**
- **Plan Ahead**: Ensure you have enough resources for daily consumption
- **Faction Choice**: Consider resource requirements when choosing your faction
- **Resource Generation**: Participate in activities to earn resources
- **Guild Benefits**: Guild activities can provide additional resources

## 🛡️ **ANTI-CHEAT SYSTEM**

### **Fair Play Protection**
The bot includes an advanced anti-cheat system that prevents automation while supporting accessibility:

#### **What's Protected Against**
- **Automation**: Bot scripts and automated gameplay
- **Multi-Account Exploitation**: Using multiple accounts to gain unfair advantages
- **Resource Transfer Abuse**: Exploiting resource transfers between accounts
- **Care Automation**: Automated child care actions

#### **What's Allowed**
- **Accessibility Tools**: Screen readers, keyboard navigation, assistive technology
- **Consistent Timing**: Regular play patterns (helpful for accessibility)
- **Legitimate Multi-Account**: Family members sharing devices (with proper documentation)

### **Anti-Cheat Features**
- **Pattern Detection**: Identifies bot-like behavior patterns
- **Resource Monitoring**: Tracks unusual resource accumulation
- **Transfer Validation**: Monitors resource transfers for abuse
- **Care Validation**: Ensures meaningful engagement in child care
- **Human Review**: Borderline cases reviewed by administrators

### **If You're Flagged**
- **Don't Panic**: Most flags are automatically resolved
- **Contact Admin**: If you believe you were incorrectly flagged
- **Provide Context**: Explain any accessibility needs or legitimate use cases
- **Appeal Process**: Administrators can review and resolve false positives

## 📚 **LORE SYSTEM**

### **Discovering Lore**
- **Search**: Use `/lore search [term]` to find specific lore
- **Browse**: Use `/lore browse [category]` to explore categories
- **Random**: Use `/lore random` to discover random entries
- **Progress**: Track your lore discovery progress

### **Lore Categories**
- **Characters**: Important people in Ravnspire's history
- **Locations**: Places of significance
- **Events**: Historical events and happenings
- **Timeline**: Chronological history
- **Items**: Important objects and artifacts
- **Factions**: Detailed faction information

### **Lore Commands**
- `/lore search [term]` - Search for specific lore
- `/lore browse [category]` - Browse by category
- `/lore view [entry_id]` - View specific lore entry
- `/lore progress` - View your discovery progress

## 🎯 **PROGRESSION & STRATEGY**

### **Early Game (Levels 1-10)**
1. **Focus on Games**: Play different games to build variety bonus
2. **Join a Guild**: Get guild bonuses and community support
3. **Explore Lore**: Discover lore for XP and understanding
4. **Build Relationships**: Start forming connections with other players

### **Mid Game (Levels 11-25)**
1. **Marriage**: Find a partner and build a family
2. **Guild District**: Invest in guild plots and buildings
3. **Arena**: Participate in competitions for rewards
4. **Character Development**: Focus on improving your character's stats

### **Late Game (Levels 26+)**
1. **Generational Play**: Switch to children and continue the legacy
2. **Advanced Achievements**: Pursue rare and legendary achievements
3. **Community Leadership**: Take leadership roles in guilds and neighborhoods
4. **Completionist**: Work toward mastering all aspects of the game

### **Pro Tips**
- **Variety is Key**: Playing different games gives you the best rewards
- **Build Relationships**: Strong relationships provide long-term benefits
- **Plan Ahead**: Consider your faction choice and long-term goals
- **Community Matters**: Active participation in guilds and neighborhoods pays off
- **Balance Activities**: Don't focus on just one aspect of the game

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **Game Not Starting**
- Check if you have an active game session
- Try using `/games list` to see available games
- Contact an admin if the issue persists

#### **Marriage Proposal Not Working**
- Ensure both players have active characters
- Check if either player is already married
- Verify the proposal hasn't expired

#### **Arena Practice Limit Reached**
- You can only practice 5 times per day
- Wait until the next day to practice again
- Focus on other activities in the meantime

#### **Guild District Plot Issues**
- Ensure your guild has sufficient funds
- Check if the plot is already owned
- Verify your guild has the required permissions

### **Getting Help**
- **Help Command**: Use `/help` for general assistance
- **Community**: Ask other players in your guild or neighborhood
- **Admins**: Contact server administrators for technical issues
- **Documentation**: Refer to this guide for detailed information

## 🎉 **CONCLUSION**

Ravnspire offers a rich, multi-layered social simulation experience. Whether you're interested in competitive gaming, building relationships, managing resources, or creating lasting legacies, there's something for everyone. Take your time to explore all the features, build meaningful connections, and create your own unique story in the world of Ravnspire.

Remember: The journey is just as important as the destination. Enjoy the process of building your character, relationships, and community. Welcome to Ravnspire, and may your legacy be legendary!
