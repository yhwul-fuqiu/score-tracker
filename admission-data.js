// admission-data / v1.0: 梦想大学录取线参考数据
// 数据来源：广东省教育考试院《广东省2026年本科普通类(物理)/(历史)投档情况》
// 取各校普通专业组（剔除高校专项、中外合作等特殊组别）的最低投档线与最低排位。
// 每年录取结束后更新此文件即可，无需改动其他代码。
window.UT_ADMISSION = {
  year: 2026,
  province: '广东',
  tracks: {
    physics: {
      label: '物理类',
      lines: {
        tsinghua: { score: 689, rank: 121 },
        pku:      { score: 690, rank: 110 },
        fudan:    { score: 679, rank: 429 },
        sjtu:     { score: 677, rank: 510 },
        zju:      { score: 676, rank: 530 },
        nju:      { score: 670, rank: 928 },
        ustc:     { score: 673, rank: 746 },
        ruc:      { score: 670, rank: 971 },
        whu:      { score: 639, rank: 9138 },
        sysu:     { score: 650, rank: 3795 }
      }
    },
    history: {
      label: '历史类',
      lines: {
        tsinghua: { score: 666, rank: 18 },
        pku:      { score: 660, rank: 29 },
        fudan:    { score: 648, rank: 128 },
        sjtu:     { score: 655, rank: 52 },
        zju:      { score: 638, rank: 275 },
        nju:      { score: 639, rank: 270 },
        ustc:     null,
        ruc:      { score: 645, rank: 164 },
        whu:      { score: 625, rank: 699 },
        sysu:     { score: 616, rank: 1364 }
      }
    }
  }
};
