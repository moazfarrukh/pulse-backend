module.exports = {
  async up(query_interface, sequelize) {
    await query_interface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: sequelize.INTEGER
      },
      email: {
        type: sequelize.STRING,
        allowNull: false,
        unique: true
      },
      display_name: {
        type: sequelize.STRING,
        allowNull: false
      },
      username: {
        type: sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: sequelize.STRING,
        allowNull: false
      },
      phone: {
        type: sequelize.STRING,
        allowNull: true,
        defaultValue: null
      },
      avatar_url: {
        type: sequelize.STRING,
        allowNull: true,
        defaultValue: null
      },
      bio: {
        type: sequelize.STRING,
        allowNull: true,
        defaultValue: null
      },
      created_at: {
        allowNull: false,
        type: sequelize.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: sequelize.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(query_interface) {
    await query_interface.dropTable('users');
  }
}; 