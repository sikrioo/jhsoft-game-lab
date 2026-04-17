/**
 * BossScheduler.js
 * 보스 딜레이 액션 큐 유틸리티
 * create()로 인스턴스를 만들어 각 보스가 독립적으로 사용
 *
 * 사용 예시:
 *   const scheduler = BossScheduler.create();
 *   scheduler.schedule(14, () => { ... });
 *   // 매 프레임
 *   scheduler.update(dt);
 *   // 보스 소멸 시
 *   scheduler.clear();
 */
window.BossScheduler = (() => {

  /**
   * 스케줄러 인스턴스 생성
   * @returns {{ schedule, update, clear, hasPending }}
   */
  function create() {
    const queue = [];

    /**
     * 딜레이 후 fn 실행 예약
     * @param {number} delay  - 프레임 단위
     * @param {function} fn
     */
    function schedule(delay, fn) {
      queue.push({ delay, fn });
    }

    /**
     * 매 프레임 호출 - 만료된 항목 실행 후 제거
     * @param {number} dt
     */
    function update(dt) {
      for (let i = queue.length - 1; i >= 0; i--) {
        queue[i].delay -= dt;
        if (queue[i].delay <= 0) {
          queue[i].fn();
          queue.splice(i, 1);
        }
      }
    }

    /** 대기 중인 모든 액션 취소 (보스 소멸 / 아레나 클리어 시 호출) */
    function clear() {
      queue.length = 0;
    }

    /** 대기 중인 액션이 있는지 여부 */
    function hasPending() {
      return queue.length > 0;
    }

    return { schedule, update, clear, hasPending };
  }

  return { create };
})();
