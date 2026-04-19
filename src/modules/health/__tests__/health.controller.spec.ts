import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach((): void => {
    controller = new HealthController();
  });

  describe('check', () => {
    it('returns status ok', (): void => {
      const result = controller.check();

      expect(result.status).toBe('ok');
    });

    it('returns a valid ISO timestamp', (): void => {
      const result = controller.check();

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('returns a non-negative uptime', (): void => {
      const result = controller.check();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
