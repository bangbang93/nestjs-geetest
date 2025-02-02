import { HttpModule } from '@nestjs/axios';
import {
  DynamicModule,
  Global,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { GEETEST_OPTIONS } from './geetest.constants';
import { GeetestVerifyGuard } from './guards/geetest-verify.guard';
import {
  GeetestModuleAsyncOptions,
  GeetestModuleOptions,
  GeetestOptionsFactory,
} from './interfaces';
import { BypassStatusProvider, GeetestOptionsProvider } from './providers';
import { BypassPollingService, GeetestService } from './services';

@Global()
@Module({
  imports: [HttpModule],
})
export class GeetestCoreModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(private readonly moduleRef: ModuleRef) {}

  static forRoot(options: GeetestModuleOptions): DynamicModule {
    return {
      module: GeetestCoreModule,
      providers: [
        {
          provide: GEETEST_OPTIONS,
          useValue: options,
        },
        GeetestService,
        GeetestOptionsProvider,
        BypassStatusProvider,
        BypassPollingService,
        GeetestVerifyGuard,
      ],
      exports: [GeetestService, GeetestOptionsProvider, GeetestVerifyGuard],
    };
  }

  static forRootAsync(options: GeetestModuleAsyncOptions): DynamicModule {
    return {
      module: GeetestCoreModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        GeetestService,
        GeetestOptionsProvider,
        BypassStatusProvider,
        BypassPollingService,
        GeetestVerifyGuard,
      ],
      exports: [GeetestService, GeetestOptionsProvider, GeetestVerifyGuard],
    };
  }

  private static createAsyncProviders(
    options: GeetestModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: GeetestModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: GEETEST_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: GEETEST_OPTIONS,
      useFactory: async (optionsFactory: GeetestOptionsFactory) =>
        await optionsFactory.createGeetestOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }

  onApplicationBootstrap = () => {
    this.moduleRef
      .get<BypassPollingService>(BypassPollingService)
      .startPolling();
  };

  onApplicationShutdown = () => {
    this.moduleRef
      .get<BypassPollingService>(BypassPollingService)
      .stopPolling();
  };
}
