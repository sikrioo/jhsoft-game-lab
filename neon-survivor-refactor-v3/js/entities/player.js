window.PlayerFactory = (() => {
  function makePlayer(){
    const S = GameState;
    const c = new PIXI.Container();
    const body = new PIXI.Graphics();

    body.beginFill(0x0b0b18, 1);
    body.lineStyle(2, 0x32f6ff, 0.9);
    body.drawPolygon([ 0,-16, 12,14, 0,8, -12,14 ]);
    body.endFill();

    const core = new PIXI.Graphics();
    core.beginFill(0xff3edb, 0.95);
    core.drawCircle(0,2,3.5);
    core.endFill();
    core.filters = Effects.asFilters(Effects.makeGlowFilter({
      color: 0xff3edb,
      distance: 18,
      outerStrength: 2.0,
      innerStrength: 0.3,
      quality: 0.25
    }));

    const shield = new PIXI.Graphics();
    shield.lineStyle(2.5, 0x7fe7ff, 0.72);
    shield.drawCircle(0, 0, 22);
    shield.beginFill(0x7fe7ff, 0.08);
    shield.drawCircle(0, 0, 20);
    shield.endFill();
    shield.alpha = 0;

    c.addChild(shield, body, core);
    c.filters = Effects.asFilters(Effects.makeGlowFilter({
      color: 0x32f6ff,
      distance: 18,
      outerStrength: 2.2,
      innerStrength: 0.4,
      quality: 0.25
    }));
    c.x = S.app.renderer.width / 2;
    c.y = S.app.renderer.height / 2;
    S.uiLayer.addChild(c);

    return {
      type:"player",
      spr:c,
      shieldSpr:shield,
      r:14,
      vx:0, vy:0,
      inv:0,
      fireCd:0,
      dashT:0
    };
  }

  return { makePlayer };
})();
