import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DestinationController } from "./destination.controller";
import { DestinationService } from "./destination.service";
import { DestinationGateway } from "./destination.gateway";
import { Destination, DestinationSchema } from "../schemas/destination.schema";
import { StorageModule } from "../shared/storage/storage.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Destination.name, schema: DestinationSchema },
    ]),
    StorageModule,
  ],
  controllers: [DestinationController],
  providers: [DestinationService, DestinationGateway],
  exports: [DestinationService],
})
export class DestinationModule {}
