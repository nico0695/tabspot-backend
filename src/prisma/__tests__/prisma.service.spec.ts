jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../dist/generated/prisma/client');
});

import { buildSoftDeleteExtension } from '../prisma.service';

type MockDelegate = {
  update: jest.Mock;
  updateMany: jest.Mock;
};

type MockBaseClient = Record<string, MockDelegate>;

function makeBaseClient(): MockBaseClient {
  return {
    genre: { update: jest.fn(), updateMany: jest.fn() },
    artist: { update: jest.fn(), updateMany: jest.fn() },
    song: { update: jest.fn(), updateMany: jest.fn() },
    tab: { update: jest.fn(), updateMany: jest.fn() },
    user: { update: jest.fn(), updateMany: jest.fn() },
  };
}

type AllOperationsHandler = (args: {
  model: string | undefined;
  operation: string;
  args: Record<string, unknown>;
  query: (a: Record<string, unknown>) => Promise<unknown>;
}) => Promise<unknown>;

describe('buildSoftDeleteExtension', () => {
  let baseClient: MockBaseClient;
  let handler: AllOperationsHandler;

  beforeEach((): void => {
    baseClient = makeBaseClient();
    const ext = buildSoftDeleteExtension(baseClient as never);
    handler = ext.query.$allModels.$allOperations as AllOperationsHandler;
  });

  it('passes through non-soft-deletable models unchanged', async (): Promise<void> => {
    const query = jest.fn().mockResolvedValue([]);
    const args = { where: {} };

    await handler({ model: 'User', operation: 'findMany', args, query });

    expect(query).toHaveBeenCalledWith(args);
  });

  it('rewrites delete to soft-delete via base client update', async (): Promise<void> => {
    const query = jest.fn();
    const whereArg = { id: 'abc' };
    baseClient['genre'].update.mockResolvedValue({});

    await handler({ model: 'Genre', operation: 'delete', args: { where: whereArg }, query });

    expect(baseClient['genre'].update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: whereArg,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('rewrites deleteMany to soft-delete via base client updateMany', async (): Promise<void> => {
    const query = jest.fn();
    const whereArg = { slug: 'rock' };
    baseClient['genre'].updateMany.mockResolvedValue({ count: 1 });

    await handler({ model: 'Genre', operation: 'deleteMany', args: { where: whereArg }, query });

    expect(baseClient['genre'].updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: whereArg,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('injects deletedAt: null into findMany where clause for soft-deletable models', async (): Promise<void> => {
    const query = jest.fn().mockResolvedValue([]);
    const args = { where: { name: 'Rock' } };

    await handler({ model: 'Genre', operation: 'findMany', args, query });

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ deletedAt: null, name: 'Rock' }),
      }),
    );
  });

  it('removes includeDeleted flag and skips deletedAt filter when set to true', async (): Promise<void> => {
    const query = jest.fn().mockResolvedValue([]);
    const args = { where: { includeDeleted: true, name: 'Rock' } };

    await handler({ model: 'Genre', operation: 'findMany', args, query });

    const calledWith = (query.mock.calls[0] as [Record<string, unknown>])[0];
    expect((calledWith['where'] as Record<string, unknown>)['includeDeleted']).toBeUndefined();
    expect((calledWith['where'] as Record<string, unknown>)['deletedAt']).toBeUndefined();
    expect((calledWith['where'] as Record<string, unknown>)['name']).toBe('Rock');
  });

  it('passes through non-find operations unchanged for soft-deletable models', async (): Promise<void> => {
    const query = jest.fn().mockResolvedValue({});
    const args = { where: { id: 'abc' }, data: { name: 'Updated' } };

    await handler({ model: 'Genre', operation: 'upsert', args, query });

    expect(query).toHaveBeenCalledWith(args);
  });
});
