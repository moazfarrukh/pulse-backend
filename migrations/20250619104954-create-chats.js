module.exports = {
  async up (query_interface, sequelize) {
    await query_interface.createTable('chats', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: sequelize.INTEGER
      },
      is_group: {
        type: sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      name: {
        type: sequelize.STRING(100),
        allowNull: true
      },
      created_by: {
        type: sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      updated_at: {
        allowNull: false,
        type: sequelize.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        allowNull: false,
        type: sequelize.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
    });
  },
  
  async down (query_interface) {
    await query_interface.dropTable('chats');
  }
}; 