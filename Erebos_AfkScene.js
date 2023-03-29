//=============================================================================
//  Erebos_AfkScene.js
//=============================================================================

/*:
 * @plugindesc 挂机场景UI交互
 * @author Erebos
 * @help
 * ——————————————————————————————————————————————————————————————————————————
 * 本插件为个人定制。具体请参考右侧插件参数。
 * 用于挂机界面的图像资源请存放于 img/system/afk 目录下
 * 
 * ================ 特殊加成标签 ================
 * 地图经验加成标签：(添加在地图备注栏)
 * <expUp: x>
 * x - 加成数值 (20表示20%，100表示100%)
 * 
 * 状态持续时间标签：(添加在状态备注栏)
 * <buffTime: x>
 * x - 秒 (60表示60秒，1000表示1000秒)
 * 
 * 物品公共事件中给人物附加经验倍率增加状态，
 * 同时调用以下脚本记录当前时间：
 * Erebos.afk.buffTime[x] = Date.now();
 * x - 经验加成状态的ID
 * 
 * 
 * ——————————————————————————————————————————————————————————————————————————
 * 请使用者遵守以下条款，谢谢！
 * 1. 允许用于任何形式的商业或非商业用途，不要求注明作者。
 * 2. 禁止以自己的名义作为插件作者二次发布、出售本插件。
 * 3. 若本插件用于违反法律、公序良俗的作品，原作者不承担由此造成的后果。
 * ——————————————————————————————————————————————————————————————————————————
 * 
 * 
 * @param classExpList
 * @text 职业获取经验列表
 * @desc 设定每一个职业的获取经验速度，列表中每一项为一个职业
 * 顺序请按照数据库中职业的顺序 (单位: x经验/秒)
 * @type number[]
 * @default ["1","1","1","1","1","1","1","1","1","1"]
 * 
 * @param mapUp
 * @text 地图加成(ID)
 * @type number[]
 * @desc 玩家在指定的地图中时，挂机会获得经验值加成,指定地图
 * ID，不要前面的0 (2为ID002的地图)
 * @default []
 * 
 * @param stateUp
 * @text 状态加成(ID)
 * @type state[]
 * @desc 指定状态ID，影响挂机的经验加成，系统会检查此列表中
 * 所有状态，效果叠加
 * @default []
 * 
 * @param
 * 
 * @param animeFrame
 * @text 动画帧数
 * @desc 指定挂机时播放动画的总帧数，按MV格式，一格即一帧
 * (如：一格宽度200px，总共5帧，则图像总宽度1000px)
 * @type number
 * @default 5
 * @min 1
 * 
 * @param
 * 
 * @param autoFile
 * @text 自动存档文件
 * @desc 指定自动存档的文件，默认为最后一个文件
 * 第1个文件为1，第2个文件为2
 * @type string
 * @default DataManager.maxSavefiles();
 * 
 * @param autoTime
 * @text 自动存档时间
 * @desc 指定自动存档的时间，存档时会消耗一定的CPU资源，
 * 请避免频繁存档带来的性能影响 (单位：分钟)
 * @type numebr
 * @default 10
 * @min 1
 * 
 */


// ================================================================================
//     Global Object Variables
// ================================================================================
Erebos.afk = {};

Erebos.afkInitialise = function() {
    Erebos.afk.parameters = PluginManager.parameters("Erebos_AfkScene");

    // ======== classExpList list
    Erebos.afk.expList = JSON.parse(Erebos.afk.parameters["classExpList"]) || [];

    // ======== EXP UP list
    Erebos.afk.mapUp = JSON.parse(Erebos.afk.parameters["mapUp"]) || [];
    for (var i = 0; i < Erebos.afk.mapUp.length; i++) {
        Erebos.afk.mapUp[i] = Number(Erebos.afk.mapUp[i]) || 0;
    };
    Erebos.afk.staUp = JSON.parse(Erebos.afk.parameters["stateUp"]) || [];
    for (var j = 0; j < Erebos.afk.staUp.length; j++) {
        Erebos.afk.staUp[j] = Number(Erebos.afk.staUp[j]) || 0;
    };

    // ======== anime
    Erebos.afk.frameCount = Number(Erebos.afk.parameters["animeFrame"]) || 1;

    // ======== auto save
    Erebos.afk.autoFile = String(Erebos.afk.parameters["autoFile"]) || "DataManager.maxSavefiles();";
    Erebos.afk.autoTime = Number(Erebos.afk.parameters["autoTime"]) || 10;

    // ======== buff time
    Erebos.afk.buffTime = {};

};

Erebos.afkInitialise();

// ================================================================================
//     Load Images for Afk Scene
// ================================================================================
ImageManager.loadSystemAfk = function(filename, hue) {
    return this.loadBitmap('img/system/afk/', filename, hue, false);
};

// =================================================================================
//         Core Function for Sprite_ButtonAfk
// =================================================================================
function Sprite_ButtonAfk() {
    this.initialize.apply(this, arguments);
};

// =================================================================================
//         Core Function for Afk
// =================================================================================
function Scene_Afk() {
    this.initialize.apply(this, arguments);
};


(function() {
    // =================================================================================================
    //         Game_BattlerBase Override Functions only for EXP Rate
    // =================================================================================================
    var _Erebos_AFK_Game_BattlerBase_traitsPi = Game_BattlerBase.prototype.traitsPi;
    Game_BattlerBase.prototype.traitsPi = function(code, id) {
        if (code === 23 && id === 9) {
            return this.traitsWithId(code, id).reduce((r, trait) => {
                return r + (trait.value - 1);
            }, 1);
        } else return _Erebos_AFK_Game_BattlerBase_traitsPi.call(this, code, id);
    };

    // =================================================================================================
    //         Preload Images for Scene_Afk
    // =================================================================================================
    const afkBgImg = ImageManager.loadSystemAfk("afkBg");
    const afkOkBtnImg = ImageManager.loadSystemAfk("afkOk");
    const afkNoBtnImg = ImageManager.loadSystemAfk("afkNo");
    const classImg = [];
    for (var a = 0; a < Erebos.afk.expList.length; a++) {
        classImg[a] = ImageManager.loadSystemAfk("class" + String(a+1));
    };
    const afkexpBarImg = ImageManager.loadSystemAfk("expBar");
    const timeNumImg = ImageManager.loadSystemAfk("timeNumber");
    const afkAnimeImg = ImageManager.loadSystemAfk("afkAnime");
    
    // =================================================================================================
    //         Sprite_ButtonAfk → Sub Class for Sprites on AFK
    // =================================================================================================
    Sprite_ButtonAfk.prototype = Object.create(Sprite_PictureButton.prototype);
    Sprite_ButtonAfk.prototype.constructor = Sprite_ButtonAfk;

    Sprite_ButtonAfk.prototype.initialize = function(bitmap, btnName, id) {
        Sprite_PictureButton.prototype.initialize.call(this, bitmap);
        this._name = btnName;
        this.id = id;
    };

    Sprite_ButtonAfk.prototype.isHovered = function() {
        if (this._name === "afkOk" || this._name === "afkNo")
            return new Rectangle(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height).contains(TouchInput.x, TouchInput.y);
        
        return new Rectangle(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height).contains(
                             TouchInput.x - this.parent.x, TouchInput.y - this.parent.y); // actor icon
    };

    Sprite_ButtonAfk.prototype.isClickEnabled = function() {
        if (!Sprite_PictureButton.prototype.isClickEnabled.call(this)) return false;
        if (this.id) return SceneManager._scene.status === "waiting";
        if (this._name === "afkOk") return SceneManager._scene.status === "waiting" && SceneManager._scene.actor;
        return true;
    };

    Sprite_ButtonAfk.prototype.onClick = function() {
        if (this.id) {
            SoundManager.playOk();
            SceneManager._scene.setActor(this.id);
            SceneManager._scene.select(this.id);
        } else {
            if (this._name === "afkOk") {
                SoundManager.playOk();
                SceneManager._scene.executeAfk();
            } else {
                SoundManager.playCancel();
                if (SceneManager._scene.status === "waiting") SceneManager.pop();
                else SceneManager._scene.stopAfk();
            }
        }
    };

    Sprite_ButtonAfk.prototype.update = function() {
        Sprite_PictureButton.prototype.update.call(this);
        
        if (this.isClickEnabled()) {
            if (this._hovered || SceneManager._scene.actorIdx === this.id) {
                if (this.scale.x < 1.15) this.scale.x += 0.03;
                if (this.scale.x > 1.15) this.scale.x = 1.15;
            } else {
                if (this.scale.x > 1.00) this.scale.x -= 0.03;
                if (this.scale.x < 1.00) this.scale.x = 1.00;
            };
            this.opacity = 255;
        } else {
            if (SceneManager._scene.actorIdx !== this.id) {
                this.scale.x = 1.00;
                this.opacity = 178;
            }
        };
        this.scale.y = this.scale.x;

    };

    // =================================================================================================

    //-----------------------------------------------------------------------------
    // Scene_Afk  =>  create Sprites
    //-----------------------------------------------------------------------------
    Scene_Afk.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Afk.prototype.constructor = Scene_Afk;

    Scene_Afk.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        Erebos.afk._topRow = 0;
        this._scrollDown = false;
        this._scrollUp = false;
        this._maxBotRow = 0;
        this._scrollFrame = 0;
        this.actor = null;
        this.actorIdx = 0;
        this.classIdx = -1;
        this.status = "waiting";
        this.second = 0;
        this.expGained = 0;
        this.frame = 0;
        this.block = 0;
    };
    
    Scene_Afk.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createArchievementUi();
    };

    Scene_Afk.prototype.createArchievementUi = function() {
        // background
        this._afkBg = new Sprite(afkBgImg);
        this._afkBg.opacity = 0;
        this.addChild(this._afkBg);

        this._actorInfo = new Sprite(new Bitmap(738, 624));
        this._actorInfo.x = 482;
        this._actorInfo.y = 97;
        this._afkBg.addChild(this._actorInfo);

        // actor list window
        this._actorList = new Sprite(new Bitmap(221, 560));
        this._actorList.x = 150;
        this._actorList.y = 127;
        const mask = new Sprite(ImageManager.loadSystemAfk("actorListMask"));
        mask.x = 150;
        mask.y = 127;
        this._actorList.mask = mask;
        this._afkBg.addChild(this._actorList);
        this._afkBg.addChild(mask);

        // actor info
        this._actorImg = [null];
        for (var a = 1; a <= $gameParty._actors.length; a++) {
            const id = $gameParty._actors[a-1];
            this._actorImg[a] = new Sprite_ButtonAfk(ImageManager.loadSystemAfk("actorIcon" + String(id)), "", a);
            this._actorImg[a].anchor.x = 0.5; this._actorImg[a].anchor.y = 0.5;
            this._actorImg[a].x = (109 + 3) * ((a - 1) % 2) + 54.5;
            this._actorImg[a].y = (Math.floor((a - 1) / 2) - Erebos.afk._topRow) * (120 + 20) + 60;
            this._actorList.addChild(this._actorImg[a]);
        };

        // afk button
        this._afkOkBtn = new Sprite_ButtonAfk(afkOkBtnImg, "afkOk", null);
        this._afkOkBtn.anchor.x = 0.5; this._afkOkBtn.anchor.y = 0.5;
        this._afkOkBtn.x = 703 + 66;
        this._afkOkBtn.y = 605 + 22.5;
        this._afkBg.addChild(this._afkOkBtn);

        this._afkNoBtn = new Sprite_ButtonAfk(afkNoBtnImg, "afkNo", null);
        this._afkNoBtn.anchor.x = 0.5; this._afkNoBtn.anchor.y = 0.5;
        this._afkNoBtn.x = 924 + 66;
        this._afkNoBtn.y = 605 + 22.5;
        this._afkBg.addChild(this._afkNoBtn);

        // afk exp bar
        this._expBar = new Sprite(new Bitmap(afkexpBarImg.width, afkexpBarImg.height));
        this._expBar.x = 487;
        this._expBar.y = 280;
        this._expBar.visible = false;
        this._afkBg.addChild(this._expBar);

        // time number
        this._timeNum = new Sprite(new Bitmap(280, 40));
        this._timeNum.x = 245;
        this._timeNum.y = 448;
        this._timeNum.visible = false;
        this._actorInfo.addChild(this._timeNum);

        // anime
        this._anime = new Sprite(afkAnimeImg);
        this._anime.blockWidth = afkAnimeImg.width / Erebos.afk.frameCount;
        this._anime.x = 866 - this._anime.blockWidth / 2;
        this._anime.y = 440 - afkAnimeImg.height / 2;
        this._anime.visible = false;
        this._afkBg.addChild(this._anime);

        this._maxBotRow = $gameParty._actors.length <= 8? 0 : Math.ceil(($gameParty._actors.length - 8) / 2);

    };

    Scene_Afk.prototype.setActor = function(index) {
        this.finalRate = 0;
        const bitmap = this._actorInfo._bitmap;
        bitmap.clear();
        bitmap.fontSize = 24;

        this.actor = $gameActors.actor($gameParty._actors[index - 1]);
        bitmap.blt(this._actorImg[index]._bitmap, 0, 0, 109, 120, 600, 250);

        const classIdOffset = Erebos.adv.class[0].class - 1;
        this.classIdx = this.actor._classId - classIdOffset - 1;
        bitmap.blt(classImg[this.classIdx], 0, 0, 201, 60, 160, 26);

        bitmap.drawText(Erebos.afk.expList[this.classIdx] + "/s", 660, 90, 78, 26, "left");
        if (Erebos.afk.mapUp.includes($gameMap.mapId())) {
            const valueTxt = $dataMap.note.match(/<expUp: .?\d+/ig);
            if (valueTxt) {
                const value = valueTxt[0].split(":")[1].trim();
                bitmap.drawText(value + "%", 660, 119, 78, 26, "left");
                this.finalRate += Number(value / 100);
            } else bitmap.drawText("0%", 660, 119, 78, 26, "left");
        };

        this.checkStateExpUp(bitmap);
        this.refreshExpAndLevel(bitmap, 0);
        this.refreshCurrentExp(bitmap);
    };

    Scene_Afk.prototype.checkStateExpUp = function(bitmap) {
        var stateUp = 0;
        for (const stateId of Erebos.afk.staUp) {
            if (this.actor.isStateAffected(stateId)) {
                const state = $dataStates[stateId];

                const valueTxt = state.note.match(/<buffTime: .?\d+/ig);
                if (valueTxt) {
                    const time = Number(valueTxt[0].split(":")[1].trim());
                    if (Date.now() - Erebos.afk.buffTime[stateId] >= time * 1000) {
                        this.actor.removeState(stateId);
                        continue;
                    };
                } else {
                    this.actor.removeState(stateId);
                    continue;
                };

                state.traits.forEach(param => {
                    if (param.code === 23 && param.dataId === 9) stateUp += (param.value - 1);
                });
            }
        };
        bitmap.drawText(String(Math.round(stateUp * 100)) + "%", 660, 147, 78, 26, "left");
    };

    Scene_Afk.prototype.refreshExpAndLevel = function(bitmap, exp) {
        bitmap.drawText(this.actor._level + "/10", 112, 276, 80, 32, "center");
        
        bitmap.drawText(String(exp), 80, 314, 140, 32, "center");
        this._expBar.visible = true;
        const expRatio = (this.actor._level === 10? 1 : (this.actor.currentExp() / this.actor.nextLevelExp()));
        const y = this._expBar._bitmap.height * (1 - expRatio);
        this._expBar._bitmap.clear();
        this._expBar._bitmap.blt(afkexpBarImg, 0, y, this._expBar._bitmap.width, this._expBar._bitmap.height - y, 0, y);
    };

    Scene_Afk.prototype.refreshCurrentExp = function(bitmap) {
        bitmap.drawText(this.actor.currentExp() + " / " + this.actor.nextLevelExp(), 6, 440, 260, 36, "center");
    };

    Scene_Afk.prototype.refreshTime = function(bitmap) {
        bitmap.clear();
        
        var sec = (this.second % 60).padZero(2);
        var min = (Math.floor(this.second / 60) % 60);
        const hour = Math.min(Math.floor(min / 60), 8);
        min = min.padZero(2);

        bitmap.blt(timeNumImg, 40 * hour, 0, 40, 40, 0, 0);
        bitmap.blt(timeNumImg, 400, 0, 40, 40, 40, 0); // ":"
        bitmap.blt(timeNumImg, 40 * Number(min.charAt(0)), 0, 40, 40, 80, 0);
        bitmap.blt(timeNumImg, 40 * Number(min.charAt(1)), 0, 40, 40, 120, 0);
        bitmap.blt(timeNumImg, 400, 0, 40, 40, 160, 0); // ":"
        bitmap.blt(timeNumImg, 40 * Number(sec.charAt(0)), 0, 40, 40, 200, 0);
        bitmap.blt(timeNumImg, 40 * Number(sec.charAt(1)), 0, 40, 40, 240, 0);
    };

    Scene_Afk.prototype.select = function(index) {
        this.actorIdx = index;
    };

    Scene_Afk.prototype.executeAfk = function() {
        this.status = "growing";
        this.expGained = 0;
        this._timeNum.visible = true;

        this._actorInfo._bitmap.clearRect(5, 117, 255, 250); // level & gained exp
        this.refreshExpAndLevel(this._actorInfo._bitmap, this.expGained);
        this.refreshTime(this._timeNum._bitmap); // time
        const scene = this;

        Erebos.afk.intervalId = setInterval(function() {
            if (scene.actor._level < 10) {
                const expPerSec = Number(Erebos.afk.expList[scene.classIdx]) * (scene.actor.exr + scene.finalRate);
                scene.expGained += expPerSec;
                scene.actor.changeExp(scene.actor.currentExp() + expPerSec, false);
                scene._actorInfo._bitmap.clearRect(5, 117, 255, 250); // level & exp
                scene.refreshExpAndLevel(scene._actorInfo._bitmap, scene.expGained);
            };

            scene._actorInfo._bitmap.clearRect(660, 147, 78, 26); // state up
            scene.checkStateExpUp(scene._actorInfo._bitmap);
            
            if (scene.second < 28800) {
                scene.second++;
                scene.refreshTime(scene._timeNum._bitmap); // time

                // auto save
                if (scene.second % (Erebos.afk.autoTime * 60) === 0) {
                    try {
                        const saveId = eval(Erebos.afk.autoFile);
                        if (isNaN(saveId)) console.log("存档ID参数有误，请检查！");
                        else setTimeout(() => {
                            $gameSystem.onBeforeSave();
                            if (DataManager.saveGame(saveId)) console.log("AutoSave Successed!");
                        }, 50);
                    } catch (e) {}
                };
            };

        }, 1000);
    };

    Scene_Afk.prototype.stopAfk = function() {
        this.status = "waiting";
        this.second = 0;
        this._timeNum.visible = false;

        this._actorInfo._bitmap.clearRect(5, 117, 255, 250); // level & gained exp
        this.refreshExpAndLevel(this._actorInfo._bitmap, 0);

        this._actorInfo._bitmap.clearRect(6, 440, 260, 36); // current exp
        this.refreshCurrentExp(this._actorInfo._bitmap);

        clearInterval(Erebos.afk.intervalId);
    };

    //-----------------------------------------------------------------------------
    // Scene_Afk  =>  Update
    //-----------------------------------------------------------------------------
    Scene_Afk.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);

        // update ui
        if (this._afkBg.opacity < 255) this._afkBg.opacity += 25.5;

        // update scroll
        if (this._afkBg.opacity >= 255) {
            if (TouchInput.wheelY >= 20 && !this._scrollDown && !this._scrollUp && $gameParty._actors.length > 8) {
                this._scrollDown = true;
                this._scrollFrame = 5;
                if (Erebos.afk._topRow < this._maxBotRow) Erebos.afk._topRow++;
            };
            if (TouchInput.wheelY <= -20 && !this._scrollDown && !this._scrollUp && $gameParty._actors.length > 8) {
                this._scrollUp = true;
                this._scrollFrame = 5;
                if (Erebos.afk._topRow > 0) Erebos.afk._topRow--;
            };
        };
        if (this._scrollDown) {
            if (this._actorImg[1].y <= 60 - (120 + 20) * this._maxBotRow) {
                this._actorImg[1].y = 60 - (120 + 20) * this._maxBotRow;
                this._scrollDown = false;
                this._scrollFrame = 0;
            } else if (this._scrollFrame > 0) {
                this._scrollFrame--;
                for (let i = 1; i < this._actorImg.length; i++) {
                    this._actorImg[i].y -= 28;
                };
            } else this._scrollDown = false;
        };
        if (this._scrollUp) {
            if (this._actorImg[1].y >= 60) {
                this._actorImg[1].y = 60;
                this._scrollUp = false;
                this._scrollFrame = 0;
            } else if (this._scrollFrame > 0) {
                this._scrollFrame--;
                for (let i = 1; i < this._actorImg.length; i++) {
                    this._actorImg[i].y += 28;
                };
            } else this._scrollUp = false;
        };

        // update anime
        if (this.status === "growing") {
            if (!this._anime.visible) this._anime.visible = true;
            if (this.frame === 0) {
                this._anime.setFrame(this._anime.blockWidth * this.block, 0, this._anime.blockWidth, afkAnimeImg.height);
                this.frame = 3;
                this.block++;
                if (this.block >= Erebos.afk.frameCount) this.block = 0;
            } else this.frame--;
        } else {
            if (this._anime.visible) this._anime.visible = false;
        };

    };

    // =========================================================================
    //         Validate Plugin Command
    // =========================================================================
    var Erebos_AFK_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        Erebos_AFK_Game_Interpreter_pluginCommand.call(this, command, args);
        
    };

}) ();
// END OF FILE
