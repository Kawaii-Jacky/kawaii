// -----------------------------------------------------------------------------------
// GEOMETRIC ALIGN FOR ALT/AZM AND EQ MOUNTS
//
// by Howard Dutton
//
// Copyright (C) 2012 to 2018 Howard Dutton
//

#pragma once

// -----------------------------------------------------------------------------------
// ADVANCED GEOMETRIC ALIGN FOR ALT/AZM MOUNTS (GOTO ASSIST)

#if MOUNT_TYPE == ALTAZM

typedef struct {
  double ha;
  double dec;
  double alt;
  double azm;
  int side;
} align_coord2_t;
// 水平对准类
class TGeoAlignH
{
  public:
    double ax1Cor;
    double ax2Cor;
    double altCor;
    double azmCor;
    double doCor;
    double pdCor;
    double dfCor;
    double tfCor;
    align_coord2_t mount[9];
    align_coord2_t actual[9];
    align_coord2_t delta[9];

    void init();//初始化
    void readCoe();//读取系数
    void writeCoe();//写入系数
    bool isReady();//检查是否准备好
    CommandErrors addStar(int I, int N, double RA, double Dec);//添加星
    void horToInstr(double Alt, double Azm, double *Alt1, double *Azm1, int PierSide);//水平到仪器
    void instrToHor(double Alt, double Azm, double *Alt1, double *Azm1, int PierSide);//仪器到水平
    void autoModel(int n);//自动模型
    void model(int n);//手动模型

  private:
    boolean geo_ready;//几何准备
    double avgAlt;//平均赤纬
    double avgAzm;//平均赤经

    double lat,cosLat,sinLat;//纬度，余弦纬度，正弦纬度

    long num,l;//数量，l
    long Ff,Df;//Ff，Df
    double best_deo, best_pd, best_pz, best_pe, best_ohw, best_odw, best_ohe, best_ode, best_tf, best_df, best_ff;//最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差，最佳对准误差
    double z1,a1;//z1，a1
    double avg_azm,avg_alt;//平均赤经，平均赤纬
    double dist,sumd,rms;//距离，距离和，距离均方根
    double best_dist;//最佳距离
    double ohe,ode,ohw,odw,dh;//ohe，ode，ohw，odw，dh
    double sa,sz,sum1;//sa，sz，sum1
    double max_dist;//最大距离

    void correct(double azm, double alt, double pierSide, double sf, double _deo, double _pd, double _pz, double _pe, double _da, double _ff, double _tf, double *z1, double *a1);
    void do_search(double sf, int p1, int p2, int p3, int p4, int p5, int p6, int p7, int p8, int p9);
};

TGeoAlignH Align;//水平对准类实例
#endif

// -----------------------------------------------------------------------------------
// ADVANCED GEOMETRIC ALIGN FOR EQUATORIAL MOUNTS (GOTO ASSIST)

#if MOUNT_TYPE != ALTAZM

typedef struct {
  double ha;
  double dec;
  int side;
} align_coord2_t;

class TGeoAlign
{
  public:
    double ax1Cor;
    double ax2Cor;
    double altCor;
    double azmCor;
    double doCor;
    double pdCor;
    double dfCor;
    double tfCor;
    align_coord2_t mount[9];
    align_coord2_t actual[9];
    align_coord2_t delta[9];

    void init();
    void readCoe();
    void writeCoe();
    bool isReady();
    CommandErrors addStar(int I, int N, double RA, double Dec);
    void equToInstr(double HA, double Dec, double *HA1, double *Dec1, int PierSide);
    void instrToEqu(double HA, double Dec, double *HA1, double *Dec1, int PierSide);
    void autoModel(int n);
    void model(int n);

  private:
    boolean geo_ready;
    double avgDec;
    double avgHA;

    double lat,cosLat,sinLat;

    long num,l;
    long Ff,Df;
    double best_deo, best_pd, best_pz, best_pe, best_ohw, best_odw, best_ohe, best_ode, best_tf, best_df, best_ff;
    double h1,d1;
    double avg_ha,avg_dec;
    double dist,sumd,rms;
    double best_dist;
    double ohe,ode,ohw,odw,dh;
    double sd,sh,sum1;
    double max_dist;

    void correct(double ha, double dec, double pierSide, double sf, double _deo, double _pd, double _pz, double _pe, double _da, double _ff, double _tf, double *h1, double *d1);
    void do_search(double sf, int p1, int p2, int p3, int p4, int p5, int p6, int p7, int p8, int p9);
};

TGeoAlign Align;
#endif

byte alignNumStars = 0;
byte alignThisStar = 0;

// 检查对准是否活动
boolean alignActive() {
  return (alignNumStars > 0) && (alignThisStar <= alignNumStars);
}

// 添加对准星，成功返回true
CommandErrors alignStar() {
  // 最后一个星后，当对准完成时，关闭赤纬翻转
  if ((alignNumStars == alignThisStar) && (meridianFlip == MeridianFlipAlign)) meridianFlip=MeridianFlipNever;

  if (alignThisStar <= alignNumStars) {
    CommandErrors e=Align.addStar(alignThisStar,alignNumStars,newTargetRA,newTargetDec);
    if (e == CE_NONE) alignThisStar++; else return e;
  } else return CE_PARAM_RANGE;

  return CE_NONE;
}
