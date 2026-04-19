import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@src/generated/prisma/client';

const SOFT_DELETABLE_MODELS = ['Artist', 'Genre', 'Song', 'Tab'] as const;
type SoftDeletableModel = (typeof SOFT_DELETABLE_MODELS)[number];

const FIND_OPERATIONS = [
  'findFirst',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'findFirstOrThrow',
  'update',
  'updateMany',
  'count',
  'aggregate',
] as const;

type SoftDeleteOperation = (args: {
  model: string | undefined;
  operation: string;
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
}) => Promise<unknown>;

export type SoftDeleteExtension = {
  query: {
    $allModels: {
      $allOperations: SoftDeleteOperation;
    };
  };
};

function isSoftDeletable(model: string | undefined): model is SoftDeletableModel {
  return SOFT_DELETABLE_MODELS.includes(model as SoftDeletableModel);
}

function toModelAccessor(model: SoftDeletableModel): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

export function buildSoftDeleteExtension(baseClient: PrismaClient): SoftDeleteExtension {
  return {
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string | undefined;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }): Promise<unknown> {
          if (!isSoftDeletable(model)) {
            return query(args);
          }

          const accessor = toModelAccessor(model);

          if (operation === 'delete') {
            // Prisma delete has no data arg — rewrite as update on the base client
            const delegate = (
              baseClient as unknown as Record<
                string,
                { update: (a: Record<string, unknown>) => Promise<unknown> }
              >
            )[accessor];
            return delegate.update({ where: args.where, data: { deletedAt: new Date() } });
          }

          if (operation === 'deleteMany') {
            const delegate = (
              baseClient as unknown as Record<
                string,
                { updateMany: (a: Record<string, unknown>) => Promise<unknown> }
              >
            )[accessor];
            return delegate.updateMany({ where: args.where, data: { deletedAt: new Date() } });
          }

          const isFindOp = (FIND_OPERATIONS as readonly string[]).includes(operation);
          if (isFindOp) {
            const where = (args.where ?? {}) as Record<string, unknown>;
            if (where['includeDeleted'] === true) {
              const restWhere = { ...where };
              delete restWhere['includeDeleted'];
              return query({ ...args, where: restWhere });
            }
            return query({ ...args, where: { ...where, deletedAt: null } });
          }

          return query(args);
        },
      },
    },
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
    super({ adapter });
    return this.$extends(buildSoftDeleteExtension(this)) as unknown as this;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
