(function () {

  // =====================================================
  // EXECUTION KERNEL (REAL STATE LAYER)
  // =====================================================

  window.TSM_EXECUTION_OS = window.TSM_EXECUTION_OS || {
    tasks: new Map(),
    log: []
  };

  function createTask(mission) {
    const task = {
      id: mission.id,
      status: "queued",
      created: Date.now(),
      updated: Date.now(),
      payload: mission
    };

    window.TSM_EXECUTION_OS.tasks.set(task.id, task);
    return task;
  }

  function updateTask(id, patch) {
    const task = window.TSM_EXECUTION_OS.tasks.get(id);
    if (!task) return;

    Object.assign(task, patch);
    task.updated = Date.now();

    emit("TASK_UPDATED", task);
  }

  function executeTask(task) {

    updateTask(task.id, { status: "running" });

    // simulate real execution boundary
    setTimeout(() => {
      updateTask(task.id, { status: "processing" });
    }, 800);

    setTimeout(() => {
      updateTask(task.id, { status: "complete" });
    }, 2000);
  }

  function emit(type, payload) {
    const event = { type, payload, ts: Date.now() };

    window.TSM_EXECUTION_OS.log.push(event);

    window.dispatchEvent(new CustomEvent("TSM_EXECUTION_EVENT", {
      detail: event
    }));
  }

  // =====================================================
  // BRIDGE: BNCA → EXECUTION OS
  // =====================================================
  window.addEventListener("TSM_CLOSED_LOOP_EVENT", (e) => {

    const data = e.detail;

    if (data.type === "MISSION_CREATED") {

      const task = createTask(data.payload);

      emit("TASK_CREATED", task);

      executeTask(task);
    }
  });

})();