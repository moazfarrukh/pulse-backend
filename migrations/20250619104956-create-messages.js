module.exports = {
  async up (query_interface, sequelize) {
    await query_interface.createTable('messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: sequelize.INTEGER
      },
      chat_id: {
        type: sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'chats',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      sender_id: {
        type: sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      content: {
        type: sequelize.TEXT,
        allowNull: false
      },
      attachments: {
        type: sequelize.STRING,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: sequelize.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      edited_at: {
        type: sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: sequelize.DATE,
        allowNull: true
      },
      deleted_at: {
        type: sequelize.DATE,
        allowNull: true
      }
    });

  },
  async down (query_interface) {
    await query_interface.dropTable('messages');
  }
}; 