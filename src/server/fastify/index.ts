import { buildApp } from './app';
import { appConfig } from './config/app';

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({
      host: appConfig.server.host,
      port: appConfig.server.port,
    });

    app.log.info(
      `Server started on ${appConfig.server.host}:${appConfig.server.port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
