-- Agrega columnas de precio escalonado por cantidad de mascotas.
-- price_1..4 son los valores para 1, 2, 3 y 4+ mascotas respectivamente.
-- NULL significa "usar el último valor no-nulo" (mismo comportamiento que el antiguo tiered()).
ALTER TABLE items_official
  ADD COLUMN IF NOT EXISTS price_1 NUMERIC,
  ADD COLUMN IF NOT EXISTS price_2 NUMERIC,
  ADD COLUMN IF NOT EXISTS price_3 NUMERIC,
  ADD COLUMN IF NOT EXISTS price_4 NUMERIC;

-- EXPO — Argentina
UPDATE items_official SET price_1=1778, price_2=2068, price_3=2258 WHERE id=83;
UPDATE items_official SET price_1=200                               WHERE id=90;

-- EXPO — Brasil
UPDATE items_official SET price_1=250,  price_2=350,  price_3=450  WHERE id=26;
UPDATE items_official SET price_1=450,  price_2=530,  price_3=610  WHERE id=27;
UPDATE items_official SET price_1=600,  price_2=680,  price_3=760  WHERE id=28;
UPDATE items_official SET price_1=480,  price_2=480,  price_3=580  WHERE id=31;

-- EXPO — Chile
UPDATE items_official SET price_1=200,  price_2=260,  price_3=340  WHERE id=54;
UPDATE items_official SET price_1=320,  price_2=450,  price_3=450  WHERE id=55;
UPDATE items_official SET price_1=350,  price_2=410,  price_3=470  WHERE id=56;
UPDATE items_official SET price_1=120,  price_2=240,  price_3=360,  price_4=480 WHERE id=57;

-- EXPO — Colombia
UPDATE items_official SET price_1=190,  price_2=290,  price_3=390  WHERE id=5;
UPDATE items_official SET price_1=780,  price_2=880,  price_3=980  WHERE id=10;

-- EXPO — Costa Rica
UPDATE items_official SET price_1=150,  price_2=210,  price_3=270  WHERE id=67;
UPDATE items_official SET price_1=280,  price_2=360,  price_3=440  WHERE id=68;
UPDATE items_official SET price_1=280,  price_2=360,  price_3=440  WHERE id=69;
UPDATE items_official SET price_1=120,  price_2=240,  price_3=360,  price_4=480 WHERE id=70;

-- EXPO — Ecuador
UPDATE items_official SET price_1=220,  price_2=280,  price_3=340  WHERE id=16;
UPDATE items_official SET price_1=780,  price_2=880,  price_3=980  WHERE id=21;

-- EXPO — Mexico
UPDATE items_official SET price_1=200,  price_2=260,  price_3=340  WHERE id=39;
UPDATE items_official SET price_1=180,  price_2=260,  price_3=340  WHERE id=40;
UPDATE items_official SET price_1=320,  price_2=380,  price_3=460  WHERE id=41;
UPDATE items_official SET price_1=120,  price_2=240,  price_3=360,  price_4=480 WHERE id=42;

-- IMPO — USA
UPDATE items_official SET price_1=575,  price_2=605,  price_3=635  WHERE id=92;

-- IMPO — Argentina
UPDATE items_official SET price_1=1780, price_2=2130, price_3=2480, price_4=2830 WHERE id=94;
UPDATE items_official SET price_1=280,  price_2=380,  price_3=450,  price_4=470  WHERE id=95;
UPDATE items_official SET price_1=120                                             WHERE id=96;
UPDATE items_official SET price_1=180,  price_2=180,  price_3=180,  price_4=380  WHERE id=98;

-- IMPO — Brasil GIG
UPDATE items_official SET price_1=1110, price_2=1140, price_3=1200 WHERE id=99;
UPDATE items_official SET price_1=120,  price_2=140,  price_3=160  WHERE id=100;
UPDATE items_official SET price_1=80,   price_2=160,  price_3=240  WHERE id=102;
UPDATE items_official SET price_1=210,  price_2=210,  price_3=270  WHERE id=103;

-- IMPO — Brasil GRU
UPDATE items_official SET price_1=950,  price_2=980,  price_3=1010 WHERE id=104;
UPDATE items_official SET price_1=170,  price_2=190,  price_3=240  WHERE id=105;
UPDATE items_official SET price_1=200,  price_2=200,  price_3=250  WHERE id=107;

-- IMPO — Brasil VCP
UPDATE items_official SET price_1=1110, price_2=1140, price_3=1200 WHERE id=108;
UPDATE items_official SET price_1=120,  price_2=140,  price_3=160  WHERE id=109;
UPDATE items_official SET price_1=80,   price_2=160,  price_3=240  WHERE id=111;
UPDATE items_official SET price_1=220,  price_2=220,  price_3=270  WHERE id=112;

-- IMPO — Chile
UPDATE items_official SET price_1=980,  price_2=1100, price_3=1220 WHERE id=113;
UPDATE items_official SET price_1=180,  price_2=210,  price_3=280  WHERE id=115;

-- IMPO — Colombia BOG
UPDATE items_official SET price_1=1150, price_2=1200, price_3=1270 WHERE id=116;
UPDATE items_official SET price_1=200,  price_2=200,  price_3=250  WHERE id=118;

-- IMPO — Colombia CLO
UPDATE items_official SET price_1=1150, price_2=1200, price_3=1270 WHERE id=119;
UPDATE items_official SET price_1=200                               WHERE id=121;

-- IMPO — Costa Rica
UPDATE items_official SET price_1=700,  price_2=800,  price_3=880  WHERE id=122;
UPDATE items_official SET price_1=180                               WHERE id=123;
UPDATE items_official SET price_1=150,  price_2=200,  price_3=220  WHERE id=125;

-- IMPO — Ecuador
UPDATE items_official SET price_1=890,  price_2=940,  price_3=990  WHERE id=126;
UPDATE items_official SET price_1=370                               WHERE id=128;
UPDATE items_official SET price_1=90,   price_2=120,  price_3=150  WHERE id=129;
UPDATE items_official SET price_1=190,  price_2=210,  price_3=230  WHERE id=130;
UPDATE items_official SET price_1=250,  price_2=280,  price_3=310  WHERE id=131;

-- IMPO — México MEX
UPDATE items_official SET price_1=1200, price_2=1430, price_3=1680, price_4=1830 WHERE id=132;
UPDATE items_official SET price_1=180,  price_2=230,  price_3=280,  price_4=320  WHERE id=135;
UPDATE items_official SET price_1=120,  price_2=140,  price_3=160,  price_4=180  WHERE id=136;
UPDATE items_official SET price_1=280,  price_2=300,  price_3=350,  price_4=400  WHERE id=137;

-- IMPO — México CUN
UPDATE items_official SET price_1=1350, price_2=1500, price_3=1650 WHERE id=147;
UPDATE items_official SET price_1=190,  price_2=240,  price_3=290  WHERE id=148;

-- IMPO — Panamá
UPDATE items_official SET price_1=856,  price_2=956,  price_3=1056 WHERE id=138;
UPDATE items_official SET price_1=146,  price_2=196,  price_3=246  WHERE id=139;
UPDATE items_official SET price_1=230,  price_2=230,  price_3=280  WHERE id=140;

-- IMPO — Perú
UPDATE items_official SET price_1=1050, price_2=1170, price_3=1300 WHERE id=141;
UPDATE items_official SET price_1=200,  price_2=200,  price_3=250  WHERE id=143;

-- IMPO — Uruguay
UPDATE items_official SET price_1=1150, price_2=1200, price_3=1250 WHERE id=144;
UPDATE items_official SET price_1=170,  price_2=220,  price_3=270  WHERE id=145;
UPDATE items_official SET price_1=210                               WHERE id=146;
