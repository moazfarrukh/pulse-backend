import { Sequelize } from 'sequelize-typescript';
import { config } from '../config';


const sequelize = new Sequelize({
    dialect: 'postgres',
    host: config.DB_HOST,
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    logging: false,
});

export default sequelize;
