-- ================================================
-- SEED: public.exercises + public.variations
-- 161 exercícios públicos (user_id = NULL)
-- 248 variações públicas (linha 18 do CSV é duplicata, ignorada)
-- IDs fixos: exercícios b{N}-..., variações c{N}-...
-- ================================================

DO $$
DECLARE
  -- Músculos (nível 2)
  m_peito   uuid := 'dc2d2b99-eff0-4a81-b949-c23e6cf61b75';
  m_costas  uuid := '9de6361c-024f-4d83-ac13-5b42d3e9cd2b';
  m_ombros  uuid := '2022b46d-433e-4c59-b462-8bd19226ade7';
  m_biceps  uuid := '1c8e2adc-312e-48eb-be92-034cbe78ec7e';
  m_triceps uuid := 'ee7ec83a-0d48-4127-a6e7-9d012b63eb65';
  m_antebr  uuid := 'd95d3718-3671-47d8-a754-3eed4b09f2a5';
  m_quad    uuid := '76334d4f-457b-4482-89fc-ee33f253a773';
  m_post    uuid := 'ee92af75-e9c2-4b0d-8566-aa6686c673ce';
  m_glut    uuid := 'ed3dccf4-dac4-4c2d-b065-3b1277cdca21';
  m_pant    uuid := 'a068a650-2506-417e-bd0b-70ee0f56a785';
  m_abd     uuid := '23bfccf7-9c69-4bc6-8203-510de9255674';
  m_lomb    uuid := 'c6872722-030c-45c4-813f-58e274b80737';

  -- Equipamentos
  eq_barra  uuid := 'd8377917-ef47-4a1d-973b-b15d0ead755c';
  eq_halt   uuid := 'bf6e017e-f787-4ca5-8457-c4a9a35d7c4d';
  eq_maq    uuid := 'b5482b82-a010-413d-9072-895ccd1934a5';
  eq_cabo   uuid := '3e234bea-7966-49e6-86e2-9003815c2195';
  eq_pc     uuid := '101de6a0-82f5-4e51-bc3c-5dcb86b8a5cd';
  eq_smith  uuid := 'd4cdf3b4-16c8-4128-9a73-564ac3f55391';
  eq_kb     uuid := '4b618dbe-72bc-4a00-a9e8-3c1da04c3cc2';
  eq_elas   uuid := 'eab26ada-e155-458e-9668-7041940273af';
  eq_anil   uuid := '38bcf675-4ecb-4a52-85bd-234ef515a264';
  eq_barraw uuid := '8a0a0028-796f-426e-a84f-250a57643718';

  -- Usuários de teste (ver 01_seed_test_users.sql)
  u_coach1   uuid := '39e03cce-5ca5-46c2-b34d-92682a582f05'; -- teste1@teste.com (Carlos Mendes)
  u_athlete1 uuid := 'af890a2d-f0fd-415e-b69d-2a52d061b8bc'; -- teste3@teste.com (Lucas Silva)

BEGIN

-- ------------------------------------------------
-- EXERCÍCIOS
-- ------------------------------------------------
INSERT INTO public.exercises (id, name, user_id, exercise_type) VALUES
  ('4c12f6c9-8c56-4b54-bb55-74c5a655311f', 'Abdominal',                              NULL, 'musculacao'),
  ('7a368894-4080-4bd9-ba73-e3851e16cb33', 'Abdominal Bicicleta',                    NULL, 'musculacao'),
  ('6ea00a62-649d-43e8-9faf-be0a4a64a384', 'Abdominal Bicicleta Pernas Elevadas',    NULL, 'musculacao'),
  ('99f75463-ed7f-48f7-a51b-33464f6d2c8a', 'Abdominal Declinado',                    NULL, 'musculacao'),
  ('448b0fa4-3ff0-4c16-bcbd-b2be72247c66', 'Abdominal no Cabo',                      NULL, 'musculacao'),
  ('e99f42d5-bb31-4493-9167-9fef941c80a1', 'Abdominal Oblíquo',                      NULL, 'musculacao'),
  ('cd969c94-75fb-4b25-a7db-2fc34c35da33', 'Abdução de Quadril',                     NULL, 'musculacao'),
  ('af62e831-6d6d-43f8-92ef-11eb2455ba4e', 'Adução de Quadril',                      NULL, 'musculacao'),
  ('0dd9d210-c0f5-46e2-a2d3-97156329175d', 'Afundo',                                 NULL, 'musculacao'),
  ('d135e0dd-2eec-44eb-b1b2-79323dde3c3d', 'Afundo Lateral',                         NULL, 'musculacao'),
  ('2fa530cf-dafe-490d-85f3-0a9c7f8c374b', 'Agachamento',                            NULL, 'musculacao'),
  ('252d9862-e340-49d8-b482-f6428747679b', 'Agachamento Búlgaro',                    NULL, 'musculacao'),
  ('ccafd837-c226-4bce-ae0e-2d03b24cab1c', 'Agachamento Frontal',                    NULL, 'musculacao'),
  ('37a5f54c-2187-429e-be3b-deac33b4de7b', 'Agachamento Goblet',                     NULL, 'musculacao'),
  ('ba8170a8-9f77-461a-8792-00d3a2a7e831', 'Agachamento Goblet com Kettlebell',      NULL, 'musculacao'),
  ('47f887ed-d312-48cd-865c-c62994838076', 'Agachamento Lateral',                    NULL, 'musculacao'),
  ('4748ee9d-29ae-4eca-8109-ed602f47d612', 'Agachamento Pendular',                   NULL, 'musculacao'),
  ('0df26e73-62b2-4577-bf61-cc4c2ece65e2', 'Agachamento Pistol',                     NULL, 'musculacao'),
  ('deb7dfa5-a5ee-4757-af11-65618810326b', 'Agachamento Sumô',                       NULL, 'musculacao'),
  ('c9e1f847-87b6-41f1-b8e9-31544e5b09cf', 'Agachamento Zercher',                    NULL, 'musculacao'),
  ('8063966b-32c7-47eb-9313-af5d9e1aaaa5', 'Arnold Press',                           NULL, 'musculacao'),
  ('f15f72e6-fec2-4de7-a058-7160627d30c4', 'Around The World',                       NULL, 'musculacao'),
  ('f58a4b71-51c9-4d7a-8465-b8ea77be6c53', 'Barra Fixa',                             NULL, 'musculacao'),
  ('27f5e0f5-4543-4ced-9da0-c702343e72b6', 'Barra Fixa Gironda',                     NULL, 'musculacao'),
  ('e1804533-1a02-4769-b084-72bca7439318', 'Barra Fixa Negativa',                    NULL, 'musculacao'),
  ('1f1ca733-f0a3-4639-8a4e-44e71ca48e7b', 'Barra Fixa Supinada',                    NULL, 'musculacao'),
  ('1416c08c-1308-4a29-a47e-a5850b6b87c2', 'Belt Squat',                             NULL, 'musculacao'),
  ('09e04f74-49d1-4f83-b88f-151bad14c587', 'Bird Dog',                               NULL, 'musculacao'),
  ('451a7603-fbb9-4cde-856a-c37f707fed08', 'Cadeira Extensora',                      NULL, 'musculacao'),
  ('8265f05b-4642-4212-ad49-19760942de17', 'Cadeira na Parede',                      NULL, 'musculacao'),
  ('675da3ff-3c09-4b4c-be28-7e0e6bac88b3', 'Caminhada Lateral com Elástico',         NULL, 'musculacao'),
  ('073dc85e-0fb3-484b-9bb3-3a0cb832f331', 'Clamshell',                              NULL, 'musculacao'),
  ('fc040cc3-1b58-4230-a246-785df09563a0', 'Cotovelo no Joelho',                     NULL, 'musculacao'),
  ('ea8ab2f6-c120-4e20-b210-578ad01e3cca', 'Crossover na Polia',                     NULL, 'musculacao'),
  ('a2182b3d-9bda-4631-969e-28a18dab4d65', 'Crossover Polia Baixa',                  NULL, 'musculacao'),
  ('0ee35e26-259f-45a3-91c2-4427f1da60b0', 'Crucifixo',                              NULL, 'musculacao'),
  ('f3e89469-cb48-4545-93ad-b9a5d1b50d26', 'Crucifixo Declinado',                    NULL, 'musculacao'),
  ('d4a787c7-7e5e-4bcc-a919-e5bc2c5d2620', 'Crucifixo Inclinado',                    NULL, 'musculacao'),
  ('90c86a11-fc63-4666-b2ba-abd454c8f4da', 'Crucifixo Inverso com Apoio',            NULL, 'musculacao'),
  ('07e75e6e-54ff-4d61-9098-cce0bc57654d', 'Dead Bug',                               NULL, 'musculacao'),
  ('f00b8d3e-e043-4d9c-ba1e-787f5eeb4ff1', 'Desenvolvimento',                        NULL, 'musculacao'),
  ('2d6c7d18-eae4-4147-9d06-69a9d81d971c', 'Desenvolvimento Militar',                NULL, 'musculacao'),
  ('29e86614-bea8-40a6-92ca-e76630d5b065', 'Dragon Flag',                            NULL, 'musculacao'),
  ('de11edc2-1809-4758-9f8a-93eb6db74d62', 'Dragonfly',                              NULL, 'musculacao'),
  ('d19eb6ec-d16a-4b4b-bbbf-dff759f9adbf', 'Elevação com Anilha Acima da Cabeça',   NULL, 'musculacao'),
  ('355628fc-2b8f-4118-acc9-532c97de58de', 'Elevação de Joelhos',                    NULL, 'musculacao'),
  ('089e168e-a2f8-41c2-b4c6-ea361b8168a4', 'Elevação de Panturrilha em Pé',          NULL, 'musculacao'),
  ('d0028ac6-985d-4b6b-acbd-0b5d2b8a1c55', 'Elevação de Pernas Deitado',             NULL, 'musculacao'),
  ('3cd58379-5d77-4f50-8b91-1b9368996c19', 'Elevação de Pernas',                     NULL, 'musculacao'),
  ('89a7abe8-0c7a-4abe-a880-f767b70d4672', 'Elevação Frontal',                       NULL, 'musculacao'),
  ('ed2d5b0b-6b1b-4f62-b89d-a40fd9125d72', 'Elevação Lateral',                       NULL, 'musculacao'),
  ('f570f1a2-d289-4685-97e2-37649f9ae4b7', 'Elevação Lateral de Pernas',             NULL, 'musculacao'),
  ('3c14deb9-7bde-43fa-8b2d-804c20fe443c', 'Elevação Pélvica',                       NULL, 'musculacao'),
  ('cbc368c1-0fe8-4d81-9065-a4513ec3bce6', 'Elevação Y',                             NULL, 'musculacao'),
  ('01dc095b-8d6e-416f-94b3-32a96bff66bf', 'Extensão de Panturrilha',                NULL, 'musculacao'),
  ('26621ba2-48ee-4137-b849-33c6f8eedd2b', 'Extensão de Tríceps',                    NULL, 'musculacao'),
  ('ad4f3f69-e74c-487d-9d3d-7742be9f1a1c', 'Extensão de Tríceps Acima da Cabeça',   NULL, 'musculacao'),
  ('3533f5a4-700b-44f0-9137-2e6018b3e664', 'Extensão Lombar',                        NULL, 'musculacao'),
  ('ea87f7b5-517f-4a9d-b9bc-60ebb6d83f3e', 'Face Pull',                              NULL, 'musculacao'),
  ('7b53fb52-d98b-48e1-817a-2271efa37b8f', 'Flexão',                                 NULL, 'musculacao'),
  ('97270a77-4590-4d98-8f7c-573b39cdc046', 'Flexão Declinada',                       NULL, 'musculacao'),
  ('04b898e4-55bf-4733-8d41-fb328fa964c5', 'Flexão Diamante',                        NULL, 'musculacao'),
  ('dd05297c-6f85-4a3f-a82c-5fd984dd0f67', 'Flexão em Parada de Mão',               NULL, 'musculacao'),
  ('4386cbe1-93bc-459f-a499-79c540bfae11', 'Flexão Inclinada',                       NULL, 'musculacao'),
  ('2c56a43a-8ca0-4e1e-91ad-ecbf56b566ef', 'Flexão Nórdica',                         NULL, 'musculacao'),
  ('c6461752-5391-40af-bd82-1bc5fb784b4c', 'Flexão Pike',                            NULL, 'musculacao'),
  ('541a09fb-2535-4dd5-ba6e-80072de7ce9c', 'Flexão Prancha',                         NULL, 'musculacao'),
  ('91d841ca-d776-41b8-b0af-aac526c361d0', 'Flexora em Pé',                          NULL, 'musculacao'),
  ('3532f4c4-1861-4f2b-842d-ae9cc9e2a44f', 'Flutter Kicks',                          NULL, 'musculacao'),
  ('6d4a6e13-781c-4c40-a8bd-71d3809dcfc2', 'Frog Pumps',                             NULL, 'musculacao'),
  ('dc9afa03-311b-4e96-9e59-d9991fad051f', 'Glute Ham Raise',                        NULL, 'musculacao'),
  ('2f07b351-9f36-43fd-857f-42dd3cf8624e', 'Glúteo Kickback',                        NULL, 'musculacao'),
  ('ab363119-0997-40c2-81f4-2f48c86ad7b1', 'Bom Dia',                                NULL, 'musculacao'),
  ('44149327-4633-495f-9a04-3b1a2e6c4ccf', 'Hack Squat',                             NULL, 'musculacao'),
  ('7038adfd-2622-4612-b84f-ccc31de58fa7', 'Heel Taps',                              NULL, 'musculacao'),
  ('357d2451-4056-41f0-8b80-7f03fb653903', 'Hex Press',                              NULL, 'musculacao'),
  ('842e9f97-ab67-4771-81c0-85fe0be99d66', 'Hiperextensão de Lombar',                NULL, 'musculacao'),
  ('e6713638-beab-4db9-a107-c3bd46d7139e', 'Hollow Rock',                            NULL, 'musculacao'),
  ('ae307331-b62f-4752-9a06-81cc5d5559ee', 'Jackknife',                              NULL, 'musculacao'),
  ('b3ee0202-cfdc-4115-935a-ccd7ddfa1952', 'JM Press',                               NULL, 'musculacao'),
  ('719bb09d-a4f0-49b6-8856-35cebd200ee1', 'Kettlebell Around the World',             NULL, 'musculacao'),
  ('7a51d108-d3ef-44b0-96c3-27ef626ae491', 'Kettlebell Halo',                        NULL, 'musculacao'),
  ('76f012dc-4600-42a3-9a6b-4b538b29e030', 'Kneeling Pulldown',                      NULL, 'musculacao'),
  ('6838dc7a-956b-4ccc-8743-27c2504ee3ec', 'L-Sit',                                  NULL, 'musculacao'),
  ('bcdb53b5-867b-40fc-bd96-c7b8ba25b09f', 'Landmine 180',                           NULL, 'musculacao'),
  ('cd7f926a-0de5-47d3-9253-eb9c08d709b4', 'Leg Press 45',                           NULL, 'musculacao'),
  ('7f73a5ce-86b1-44b8-aeff-1f1c760d470b', 'Leg Press Horizontal',                   NULL, 'musculacao'),
  ('d9b4499c-9791-4e23-b25d-3873056c1145', 'Levantamento Terra',                     NULL, 'musculacao'),
  ('f14f182b-77c5-4450-a277-fd17592c237d', 'Levantamento Terra Sumô',                NULL, 'musculacao'),
  ('aab7ca0e-77c8-463b-91bf-791151650672', 'Dip',                                    NULL, 'musculacao'),
  ('03033496-8485-4765-a676-8c57b986de56', 'Dip para Peito',                         NULL, 'musculacao'),
  ('4185fafe-98f6-4fe0-a620-31eb2acf3044', 'Dip para Tríceps',                       NULL, 'musculacao'),
  ('1c78c665-d0c1-4360-900c-ed2b02b95661', 'Mesa Flexora',                           NULL, 'musculacao'),
  ('8e1a35f8-89d5-45c4-a008-d7b29b1fcc65', 'Pallof Press',                           NULL, 'musculacao'),
  ('68a05d34-8ef6-4d7c-a46e-05b6f0d277e8', 'Panturrilha na Prensa',                  NULL, 'musculacao'),
  ('0c3f10cb-e51a-4f1b-a594-ec02793cef9c', 'Peck Deck',                              NULL, 'musculacao'),
  ('a38c4127-7722-423d-ba3d-dc896fef5801', 'Ponte de Glúteos',                       NULL, 'musculacao'),
  ('4847c7ab-ea7e-419d-aa3e-c32a5896a35b', 'Prancha',                                NULL, 'musculacao'),
  ('996ae939-e389-4b95-93af-089ed36c0345', 'Pressdown de Tríceps',                   NULL, 'musculacao'),
  ('74531d60-d4f4-49c1-81b9-83577efbfb38', 'Pull Through no Cabo',                   NULL, 'musculacao'),
  ('a54dae85-0ee8-4640-8e5c-6c7e6727d8a8', 'Pullover',                               NULL, 'musculacao'),
  ('22679ca5-ff11-43f0-892f-c06d27ed7ba2', 'Push Press',                             NULL, 'musculacao'),
  ('34659a06-4529-4308-ae97-7c7a91f98e89', 'Pushdown de Tríceps',                    NULL, 'musculacao'),
  ('e105c303-d6c3-4c2d-ac24-0dcc142c8f40', 'Puxada com Braço Estendido',             NULL, 'musculacao'),
  ('0db36693-5543-448e-aea7-1ab030899a54', 'Puxada Frontal',                         NULL, 'musculacao'),
  ('c97df85e-5103-481d-8a3c-0c888184118a', 'Rack Pull',                              NULL, 'musculacao'),
  ('cfa8d44e-368e-4bc6-a876-7553b8576ac7', 'Remada Alta',                            NULL, 'musculacao'),
  ('9119ee68-a5ee-4006-bf31-b74cc6b3b512', 'Remada Baixa',                           NULL, 'musculacao'),
  ('e9ebcfc6-9b3d-4740-8a5e-9184fec94ca6', 'Remada Cavalinho',                       NULL, 'musculacao'),
  ('5340f56a-d671-4bae-a726-ec5cf037dff4', 'Remada Curvada',                         NULL, 'musculacao'),
  ('d53f500f-ea1f-42cd-a556-c0cb23920b57', 'Remada Gorila',                          NULL, 'musculacao'),
  ('a78faa97-cf3f-4ec0-8c13-6e01b0d0cef7', 'Remada Inclinada',                       NULL, 'musculacao'),
  ('c3962733-254c-4c57-bfe6-6396abe814b0', 'Remada Invertida',                       NULL, 'musculacao'),
  ('1cf47217-225b-4837-a772-ff34e9074002', 'Remada',                                 NULL, 'musculacao'),
  ('d9644c72-9290-48e7-80a1-3ad5db84ef98', 'Remada Landmine',                        NULL, 'musculacao'),
  ('0270c5ba-7a8e-4fda-a213-49e88322b4b0', 'Remada Meadows',                         NULL, 'musculacao'),
  ('1d60e7cd-e5ed-4ebb-b974-e1034d917510', 'Remada Pendlay',                         NULL, 'musculacao'),
  ('2efccc6d-919d-44e4-a449-695ad8f2dccd', 'Remada Unilateral',                      NULL, 'musculacao'),
  ('ac766105-46d9-4f0c-9f11-d7a4b5041a08', 'Roda Abdominal',                         NULL, 'musculacao'),
  ('18e5a627-d5dd-424f-a612-bf8400003dcb', 'Rosca 21',                               NULL, 'musculacao'),
  ('f4f26eb0-93d7-41ee-82df-b694a992c80d', 'Rosca',                                  NULL, 'musculacao'),
  ('9529a324-8504-418b-adf6-5e0a41664f7e', 'Rosca Concentrada',                      NULL, 'musculacao'),
  ('f33aa644-e073-4473-b33b-985993397298', 'Rosca de Punho por Trás',               NULL, 'musculacao'),
  ('82e7b25b-da7d-448a-b759-9175d1ddb7b1', 'Rosca Direta',                           NULL, 'musculacao'),
  ('96241a67-1874-4f61-9a18-7094712d91ab', 'Rosca Drag',                             NULL, 'musculacao'),
  ('1af208ad-1619-4d3f-b8e4-297fb29873ef', 'Rosca Martelo',                          NULL, 'musculacao'),
  ('592adc03-84e0-4d6a-b29a-432263e0a3d4', 'Rosca Overhead',                         NULL, 'musculacao'),
  ('6a1d8dca-c66f-4704-a85e-aa247db7b126', 'Rosca Pinwheel',                         NULL, 'musculacao'),
  ('58a56cba-c652-4fb0-a7e8-c7f1f3a9ec4e', 'Rosca por Trás',                         NULL, 'musculacao'),
  ('27107df2-4046-4ef2-bc95-50d3f197454d', 'Rosca Scott',                            NULL, 'musculacao'),
  ('7bb6437a-df19-4670-8109-3e095acbdc8b', 'Rosca Waiter',                           NULL, 'musculacao'),
  ('c1272677-46ad-40e9-b705-15b74164b06e', 'Rosca Zottman',                          NULL, 'musculacao'),
  ('a77ac944-b60d-410a-b727-2917788ae09a', 'Rotação de Tronco',                      NULL, 'musculacao'),
  ('4782cef7-9fab-462f-8100-3a961c650cf1', 'Rotação no Cabo',                        NULL, 'musculacao'),
  ('f53e9af4-a4b3-4ac2-ba01-4cabaf6b5880', 'Salto de Sapo',                          NULL, 'musculacao'),
  ('5c3df913-6b4f-4f60-8084-3daa796547f9', 'Salto Lateral no Caixote',               NULL, 'musculacao'),
  ('df2681c1-7bf3-4ca0-b82d-0a0a7e89c7c8', 'Salto no Caixote',                       NULL, 'musculacao'),
  ('10f27594-7c4e-4ef9-ad97-2826a6773a77', 'Squeeze Press',                          NULL, 'musculacao'),
  ('829dfbed-e3ed-4b24-8a72-95972772cf7d', 'Step Up',                                NULL, 'musculacao'),
  ('6ad56076-cc17-4c22-af6b-8fc16e4b3a0d', 'Superman',                               NULL, 'musculacao'),
  ('7fffec13-4aec-401f-9bb9-d088fca94114', 'Supino com Anilha',                      NULL, 'musculacao'),
  ('bc57be7e-0d79-49f8-9ff3-db1295badea1', 'Supino com Pés Elevados',               NULL, 'musculacao'),
  ('c7ddec5f-188f-4163-81a0-5ef0b7be57da', 'Supino Declinado',                       NULL, 'musculacao'),
  ('a624f2b9-e5b1-4210-83e3-419cb86f7660', 'Supino Inclinado',                       NULL, 'musculacao'),
  ('a5990bb4-be1d-43ae-89cd-a7bb80f33040', 'Supino',                                 NULL, 'musculacao'),
  ('7331b0db-ebbc-43bd-a169-765089abc12c', 'Supino no Chão',                         NULL, 'musculacao'),
  ('7e536b66-0f8d-4838-8ae8-bd9c61e2c030', 'Suspensão na Barra',                     NULL, 'musculacao'),
  ('886811f2-bda7-4f03-ac12-35f2f78a484f', 'Svend Press',                            NULL, 'musculacao'),
  ('add7e2e8-8a6a-4390-843e-fb366b271e27', 'Tesoura Abdominal',                      NULL, 'musculacao'),
  ('9d77abb3-b32a-4624-86b2-f4bb18aaf63e', 'Toe Touch',                              NULL, 'musculacao'),
  ('c157a66b-be1a-46d7-b03b-4b220d403a29', 'Toes to Bar',                            NULL, 'musculacao'),
  ('1fbcc72a-1055-4f53-a303-ae4800f32100', 'Tração Vertical',                        NULL, 'musculacao'),
  ('893bf8af-ee7b-4e01-84c1-0dc00f213ce1', 'Tríceps Corda',                          NULL, 'musculacao'),
  ('9e6dee6e-1b7c-4567-8ad7-64a49757dc34', 'Tríceps Cotovelo Aberto',               NULL, 'musculacao'),
  ('55d83dc2-cd6b-4c22-8246-1a2c9bf6d871', 'Tríceps Kickback',                       NULL, 'musculacao'),
  ('c104725c-9fa6-438c-82bc-1baf5a7c0f8f', 'V Up',                                   NULL, 'musculacao'),
  ('0fe01367-8314-4ee0-bc36-67b826c04e81', 'Alongamento de Posterior',                NULL, 'preparatorio'),
  ('81813c26-484c-470d-a557-9fb8a36cd8ce', 'Alongamento de Peitoral',                 NULL, 'preparatorio'),
  ('95358b8e-d2b7-4728-9119-28b9e6716327', 'Mobilidade de Quadril',                   NULL, 'preparatorio'),
  ('6c1b1d7b-7994-4ff1-aa63-20e0ca3df1fd', 'Rotação de Ombros',                       NULL, 'preparatorio'),
  ('49a46ea8-7dcf-4ad8-9489-86f5a7d4b029', 'Corrida Estacionária',                    NULL, 'preparatorio'),
  ('7e5c0a17-9b2d-4c3e-8a1f-2b6d4e8c0a17', 'Corrida',                                 NULL, 'musculacao')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------
-- VARIAÇÕES
-- ------------------------------------------------
INSERT INTO public.variations (id, name, exercise_id, muscle_id, secondary_muscle_id, equipment_id, measurement_type) VALUES
  -- Abdominal (e001)
  ('f7fe173e-b9c5-4743-a3c9-a12602179762', NULL,                '4c12f6c9-8c56-4b54-bb55-74c5a655311f', m_abd,    NULL,      eq_pc, 'reps'),
  ('e5e4ac54-e120-4d39-90e4-f204e877536b', NULL,                '4c12f6c9-8c56-4b54-bb55-74c5a655311f', m_abd,    NULL,      eq_maq, 'weight_reps'),
  -- Abdominal Bicicleta (e002)
  ('d0b6a0b0-57d9-40d0-a33c-28cec65ff3f8', NULL,                '7a368894-4080-4bd9-ba73-e3851e16cb33', m_abd,    NULL,      eq_pc, 'reps'),
  -- Abdominal Bicicleta Pernas Elevadas (e003)
  ('7cba23f0-1e46-46ea-ac7a-1796d71b9637', NULL,                '6ea00a62-649d-43e8-9faf-be0a4a64a384', m_abd,    NULL,      eq_pc, 'reps'),
  -- Abdominal Declinado (e004)
  ('1c24d643-efb6-4f0d-a2d4-00ae994b9f20', NULL,                '99f75463-ed7f-48f7-a51b-33464f6d2c8a', m_abd,    NULL,      eq_pc, 'reps'),
  -- Abdominal no Cabo (e005)
  ('ba5aa33c-0f13-4596-8624-4d1abdd0fce8', NULL,                '448b0fa4-3ff0-4c16-bcbd-b2be72247c66', m_abd,    NULL,      eq_cabo, 'weight_reps'),
  -- Abdominal Oblíquo (e006)
  ('d231a714-a9e4-49cb-abe5-c8d48db35221', NULL,                'e99f42d5-bb31-4493-9167-9fef941c80a1', m_abd,    NULL,      eq_pc, 'reps'),
  -- Abdução de Quadril (e007)
  ('0295be66-4916-47d2-a341-bd67ee7cac6d', NULL,                'cd969c94-75fb-4b25-a7db-2fc34c35da33', m_glut,   NULL,      eq_maq, 'weight_reps'),
  -- Adução de Quadril (e008)
  ('1317d780-c423-43ed-917f-672396856f42', NULL,                'af62e831-6d6d-43f8-92ef-11eb2455ba4e', m_quad,   NULL,      eq_maq, 'weight_reps'),
  -- Afundo (e009)
  ('83a62cbc-4969-484e-96c7-dfaa1dffe302', NULL,                '0dd9d210-c0f5-46e2-a2d3-97156329175d', m_quad,   m_post,    eq_pc, 'reps'),
  ('8e9cf0bf-2e87-4703-ab25-884e1f8abb42', NULL,                '0dd9d210-c0f5-46e2-a2d3-97156329175d', m_quad,   m_post,    eq_barra, 'weight_reps'),
  ('f0f7f8a0-f34b-4183-a1e4-559353348179', NULL,                '0dd9d210-c0f5-46e2-a2d3-97156329175d', m_quad,   m_post,    eq_halt, 'weight_reps'),
  ('b834aa7b-4def-4459-beb9-47cd38951558', 'Overhead',          '0dd9d210-c0f5-46e2-a2d3-97156329175d', m_quad,   m_post,    eq_halt, 'weight_reps'),
  ('73fd44e1-bb08-48ed-b303-d37f25a5f89b', 'com Salto',         '0dd9d210-c0f5-46e2-a2d3-97156329175d', m_quad,   m_post,    eq_pc, 'reps'),
  ('4dfca691-644a-4bee-892e-1d315585a105', 'Cruzado',           '0dd9d210-c0f5-46e2-a2d3-97156329175d', m_quad,   m_glut,    eq_halt, 'weight_reps'),
  -- Afundo Lateral (e010)
  ('35c32c0f-16b6-4f6b-b2b4-5bd2b7b54d78', NULL,                'd135e0dd-2eec-44eb-b1b2-79323dde3c3d', m_quad,   m_post,    eq_pc, 'reps'),
  -- Agachamento (e011)
  ('ed80e128-6332-4563-9f8f-3029857ad012', NULL,                '2fa530cf-dafe-490d-85f3-0a9c7f8c374b', m_quad,   m_post,    eq_elas, 'weight_reps'),
  ('7833c241-b639-4ff2-af20-2d12a8840b6f', NULL,                '2fa530cf-dafe-490d-85f3-0a9c7f8c374b', m_quad,   m_post,    eq_barra, 'weight_reps'),
  ('5f8a5608-8960-49b0-96b6-9d0e805eee2d', NULL,                '2fa530cf-dafe-490d-85f3-0a9c7f8c374b', m_quad,   m_post,    eq_halt, 'weight_reps'),
  ('f1633314-a0c7-4488-9bde-411a100f806f', NULL,                '2fa530cf-dafe-490d-85f3-0a9c7f8c374b', m_quad,   m_post,    eq_maq, 'weight_reps'),
  ('eca724a5-8abd-4dc3-b648-85d3b37304f5', NULL,                '2fa530cf-dafe-490d-85f3-0a9c7f8c374b', m_quad,   m_post,    eq_smith, 'weight_reps'),
  ('6dbc459d-b204-4068-bf34-8d539cb79a30', 'com Salto',         '2fa530cf-dafe-490d-85f3-0a9c7f8c374b', m_quad,   m_post,    eq_pc, 'reps'),
  -- Agachamento Búlgaro (e012)
  ('f76de511-4232-47c8-ac92-b9c326cd64d5', NULL,                '252d9862-e340-49d8-b482-f6428747679b', m_quad,   m_glut,    eq_halt, 'weight_reps'),
  -- Agachamento Frontal (e013)
  ('3dd31e11-4eef-4e89-a07a-dc14a880c9a5', NULL,                'ccafd837-c226-4bce-ae0e-2d03b24cab1c', m_quad,   m_post,    eq_barra, 'weight_reps'),
  -- Agachamento Goblet (e014)
  ('30931b28-e20d-478d-a007-ba527e8c6a8b', NULL,                '37a5f54c-2187-429e-be3b-deac33b4de7b', m_quad,   m_post,    eq_halt, 'weight_reps'),
  -- Agachamento Goblet com Kettlebell (e015)
  ('eba2a38d-8060-4f21-9ba2-247f86909d30', NULL,                'ba8170a8-9f77-461a-8792-00d3a2a7e831', m_quad,   m_glut,    eq_kb, 'weight_reps'),
  -- Agachamento Lateral (e016)
  ('8362767f-9197-4a18-9378-c098332e0c18', NULL,                '47f887ed-d312-48cd-865c-c62994838076', m_quad,   m_post,    eq_pc, 'reps'),
  -- Agachamento Pendular (e017)
  ('b176ca8d-7e59-4552-b3b3-781585d7126a', NULL,                '4748ee9d-29ae-4eca-8109-ed602f47d612', m_quad,   m_glut,    eq_maq, 'weight_reps'),
  -- Agachamento Pistol (e018)
  ('0fb67e93-3a4f-4287-918f-a05dc084ada2', NULL,                '0df26e73-62b2-4577-bf61-cc4c2ece65e2', m_quad,   m_post,    eq_pc, 'reps'),
  ('bf6d123b-5fcc-46c4-b140-f1e57ae22122', 'Assistido',         '0df26e73-62b2-4577-bf61-cc4c2ece65e2', m_quad,   m_post,    eq_pc, 'reps'),
  -- Agachamento Sumô (e019)
  ('ac4738e2-8a56-4643-87b9-e63927d91dcb', NULL,                'deb7dfa5-a5ee-4757-af11-65618810326b', m_quad,   m_post,    eq_barra, 'weight_reps'),
  ('aa132d61-68bb-4792-956d-a91617dc01e1', NULL,                'deb7dfa5-a5ee-4757-af11-65618810326b', m_quad,   m_glut,    eq_halt, 'weight_reps'),
  ('2fcd874f-f11a-4b41-ad72-e72fcf5faf88', NULL,                'deb7dfa5-a5ee-4757-af11-65618810326b', m_quad,   m_glut,    eq_kb, 'weight_reps'),
  -- Agachamento Zercher (e020)
  ('9a1f8ef9-9ead-45fa-9b86-6faf962f6c6c', NULL,                'c9e1f847-87b6-41f1-b8e9-31544e5b09cf', m_quad,   m_post,    eq_barra, 'weight_reps'),
  -- Arnold Press (e021)
  ('131a4155-df5d-413f-8886-ecc73eafec91', NULL,                '8063966b-32c7-47eb-9313-af5d9e1aaaa5', m_ombros, m_triceps, eq_halt, 'weight_reps'),
  -- Around The World (e022)
  ('68c9b35f-62b0-4c5f-8cf5-380f7b90a6dc', NULL,                'f15f72e6-fec2-4de7-a058-7160627d30c4', m_peito,  m_costas,  eq_halt, 'weight_reps'),
  -- Barra Fixa (e023)
  ('3873579a-a3ea-41fb-8113-71faf78ea0e3', NULL,                'f58a4b71-51c9-4d7a-8465-b8ea77be6c53', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  ('2ee69a6e-4dba-4f8e-8360-7be855dde8ce', NULL,                'f58a4b71-51c9-4d7a-8465-b8ea77be6c53', m_costas, m_biceps,  eq_elas, 'weight_reps'),
  ('8d1a656d-f1a5-40c8-97b6-61317dd2a568', NULL,                'f58a4b71-51c9-4d7a-8465-b8ea77be6c53', m_costas, m_biceps,  eq_pc, 'reps'),
  -- Barra Fixa Gironda (e024)
  ('dec06877-330f-4888-9c75-af6239727fcd', NULL,                '27f5e0f5-4543-4ced-9da0-c702343e72b6', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  -- Barra Fixa Negativa (e025)
  ('cb306227-40d0-41fd-879c-f6d63dc5b381', NULL,                'e1804533-1a02-4769-b084-72bca7439318', m_costas, m_biceps,  eq_pc, 'reps'),
  -- Barra Fixa Supinada (e026)
  ('1fd7470d-b0ba-4d4a-b0fe-a02f22113440', 'Supinada',          '1f1ca733-f0a3-4639-8a4e-44e71ca48e7b', m_costas, m_biceps,  eq_pc, 'reps'),
  -- Belt Squat (e027)
  ('e6462c11-406a-4ede-b8c3-88041679133e', NULL,                '1416c08c-1308-4a29-a47e-a5850b6b87c2', m_quad,   m_glut,    eq_maq, 'weight_reps'),
  -- Bird Dog (e028)
  ('99e42ad3-196a-4d2d-ac9f-20aae0d480ec', NULL,                '09e04f74-49d1-4f83-b88f-151bad14c587', m_glut,   m_post,    eq_pc, 'reps'),
  -- Cadeira Extensora (e029)
  ('43513e3b-0e1f-404e-9fbe-7f16972d59a4', NULL,                '451a7603-fbb9-4cde-856a-c37f707fed08', m_quad,   NULL,      eq_maq, 'weight_reps'),
  -- Cadeira na Parede (e030)
  ('aec4e218-09c0-446f-87b1-2b71024adb21', NULL,                '8265f05b-4642-4212-ad49-19760942de17', m_quad,   m_abd,     eq_pc, 'reps'),
  -- Caminhada Lateral com Elástico (e031)
  ('4b8c0944-5a80-4231-a06c-9b9b1148f988', NULL,                '675da3ff-3c09-4b4c-be28-7e0e6bac88b3', m_glut,   NULL,      eq_elas, 'weight_reps'),
  -- Clamshell (e032)
  ('7b1c628f-0859-4aec-b6f4-8a6c7afbb0ac', NULL,                '073dc85e-0fb3-484b-9bb3-3a0cb832f331', m_glut,   NULL,      eq_elas, 'weight_reps'),
  -- Cotovelo no Joelho (e033)
  ('81803cfa-f350-4c4a-81d6-ff2a51157d91', NULL,                'fc040cc3-1b58-4230-a246-785df09563a0', m_abd,    NULL,      eq_pc, 'reps'),
  -- Crossover na Polia (e034)
  ('a4938bf4-d698-4d6c-9564-334337201cf7', NULL,                'ea8ab2f6-c120-4e20-b210-578ad01e3cca', m_peito,  NULL,      eq_maq, 'weight_reps'),
  -- Crossover Polia Baixa (e035)
  ('fb4872ac-f139-4788-9983-bd235aa5aff1', NULL,                'a2182b3d-9bda-4631-969e-28a18dab4d65', m_peito,  NULL,      eq_maq, 'weight_reps'),
  -- Crucifixo (e036)
  ('2187cb64-bad4-4b9d-a582-ec84be10c679', NULL,                '0ee35e26-259f-45a3-91c2-4427f1da60b0', m_peito,  NULL,      eq_halt, 'weight_reps'),
  ('b510c150-ede2-4593-8bd4-d74abdd4d01e', NULL,                '0ee35e26-259f-45a3-91c2-4427f1da60b0', m_peito,  NULL,      eq_maq, 'weight_reps'),
  -- Crucifixo Declinado (e037)
  ('10d5f0b5-9525-439f-b788-4d7bd1d2630e', NULL,                'f3e89469-cb48-4545-93ad-b9a5d1b50d26', m_peito,  NULL,      eq_halt, 'weight_reps'),
  -- Crucifixo Inclinado (e038)
  ('de648560-4216-4415-a7d7-c5a2fc0062a6', NULL,                'd4a787c7-7e5e-4bcc-a919-e5bc2c5d2620', m_peito,  NULL,      eq_halt, 'weight_reps'),
  -- Crucifixo Inverso com Apoio (e039)
  ('b49ccd45-1bdf-4a04-99e5-8b452996e43c', NULL,                '90c86a11-fc63-4666-b2ba-abd454c8f4da', m_ombros, m_costas,  eq_halt, 'weight_reps'),
  -- Dead Bug (e040)
  ('f7b0ba13-425e-4550-9f68-b916921e7cbc', NULL,                '07e75e6e-54ff-4d61-9098-cce0bc57654d', m_abd,    NULL,      eq_pc, 'reps'),
  -- Desenvolvimento (e041)
  ('dae52f72-60fd-4545-8d77-aeb2a01040bf', NULL,                'f00b8d3e-e043-4d9c-ba1e-787f5eeb4ff1', m_ombros, m_triceps, eq_barra, 'weight_reps'),
  ('b8dcbe88-f5ce-438f-acc0-f9d26d60781b', NULL,                'f00b8d3e-e043-4d9c-ba1e-787f5eeb4ff1', m_ombros, m_triceps, eq_halt, 'weight_reps'),
  ('750d51b6-669f-4811-a7c8-5c8ec80c83fe', NULL,                'f00b8d3e-e043-4d9c-ba1e-787f5eeb4ff1', m_ombros, m_triceps, eq_smith, 'weight_reps'),
  ('d212839f-320a-4261-8bb2-455f286e5d06', NULL,                'f00b8d3e-e043-4d9c-ba1e-787f5eeb4ff1', m_ombros, m_triceps, eq_kb, 'weight_reps'),
  -- Desenvolvimento Militar (e042)
  ('d9f1683d-162b-4592-a17e-fe5fa52d0cde', 'em Pé',             '2d6c7d18-eae4-4147-9d06-69a9d81d971c', m_ombros, m_triceps, eq_barra, 'weight_reps'),
  -- Dragon Flag (e043)
  ('3110a15b-400d-4fa1-9c6f-633d818b6f30', NULL,                '29e86614-bea8-40a6-92ca-e76630d5b065', m_abd,    NULL,      eq_pc, 'reps'),
  -- Dragonfly (e044)
  ('e1e166a3-6f14-4adb-a574-e9913c229c58', NULL,                'de11edc2-1809-4758-9f8a-93eb6db74d62', m_abd,    NULL,      eq_pc, 'reps'),
  -- Elevação com Anilha Acima da Cabeça (e045)
  ('5d1f18c7-f10a-4288-969a-9f4e6c33d01f', NULL,                'd19eb6ec-d16a-4b4b-bbbf-dff759f9adbf', m_ombros, m_costas,  eq_anil, 'weight_reps'),
  -- Elevação de Joelhos (e046)
  ('b607df06-7d6f-48bb-946c-3347fa09cbb9', 'Deitado',           '355628fc-2b8f-4118-acc9-532c97de58de', m_abd,    NULL,      eq_pc, 'reps'),
  ('9318afc5-19c2-4078-9be4-02a8a53b476a', 'nas Paralelas',     '355628fc-2b8f-4118-acc9-532c97de58de', m_abd,    NULL,      eq_pc, 'reps'),
  ('9ea52c69-8ae9-4fc7-b850-c1e059265925', 'Suspenso',          '355628fc-2b8f-4118-acc9-532c97de58de', m_abd,    m_antebr,  eq_pc, 'reps'),
  -- Elevação de Panturrilha em Pé (e047)
  ('884133ff-7c87-4c24-a4e7-5078fde80526', NULL,                '089e168e-a2f8-41c2-b4c6-ea361b8168a4', m_pant,   NULL,      eq_pc, 'reps'),
  ('c22eba41-705d-46d7-a38f-e058e7f059ef', NULL,                '089e168e-a2f8-41c2-b4c6-ea361b8168a4', m_pant,   NULL,      eq_barra, 'weight_reps'),
  ('5ac8484b-4d25-4ab5-9f52-2a6680a7466c', NULL,                '089e168e-a2f8-41c2-b4c6-ea361b8168a4', m_pant,   NULL,      eq_halt, 'weight_reps'),
  ('52021d95-ddfa-4c8d-8133-91f829ce90bb', NULL,                '089e168e-a2f8-41c2-b4c6-ea361b8168a4', m_pant,   NULL,      eq_maq, 'weight_reps'),
  ('9904d59d-ce79-4f27-b662-6962755ed2f9', NULL,                '089e168e-a2f8-41c2-b4c6-ea361b8168a4', m_pant,   NULL,      eq_smith, 'weight_reps'),
  -- Elevação de Pernas Deitado (e048)
  ('8f04bc77-802a-42f9-b8e6-8e51f00c3e14', NULL,                'd0028ac6-985d-4b6b-acbd-0b5d2b8a1c55', m_abd,    NULL,      eq_pc, 'reps'),
  -- Elevação de Pernas (e049)
  ('36c044ae-ad6f-492c-960c-4b9eec3e1cee', 'nas Paralelas',     '3cd58379-5d77-4f50-8b91-1b9368996c19', m_abd,    NULL,      eq_pc, 'reps'),
  ('fbcbfa32-da07-45c8-a7eb-4282f69a685d', 'Suspenso',          '3cd58379-5d77-4f50-8b91-1b9368996c19', m_abd,    m_antebr,  eq_pc, 'reps'),
  -- Elevação Frontal (e050)
  ('cfbe8f4f-d54f-477e-82d0-15dea961f67d', NULL,                '89a7abe8-0c7a-4abe-a880-f767b70d4672', m_ombros, NULL,      eq_elas, 'weight_reps'),
  ('44123477-9610-490b-8a0c-98aa6789fa9a', NULL,                '89a7abe8-0c7a-4abe-a880-f767b70d4672', m_ombros, NULL,      eq_barra, 'weight_reps'),
  ('9f02f034-6df7-410c-b690-1697656d3ed8', NULL,                '89a7abe8-0c7a-4abe-a880-f767b70d4672', m_ombros, NULL,      eq_cabo, 'weight_reps'),
  ('deef49b2-f60c-4cec-8e45-e65102abdead', NULL,                '89a7abe8-0c7a-4abe-a880-f767b70d4672', m_ombros, NULL,      eq_halt, 'weight_reps'),
  ('bb2fad3b-a06a-48a7-a0c1-ec08464c5f0c', NULL,                '89a7abe8-0c7a-4abe-a880-f767b70d4672', m_ombros, NULL,      eq_anil, 'weight_reps'),
  -- Elevação Lateral (e051)
  ('50c940d7-37a6-4ea1-bb4f-25beebb40995', NULL,                'ed2d5b0b-6b1b-4f62-b89d-a40fd9125d72', m_ombros, NULL,      eq_elas, 'weight_reps'),
  ('3a582edc-98c1-4b28-b3b5-c405c0cde1a5', NULL,                'ed2d5b0b-6b1b-4f62-b89d-a40fd9125d72', m_ombros, NULL,      eq_cabo, 'weight_reps'),
  ('833a1694-88ef-45f2-a00a-46951b490b9d', NULL,                'ed2d5b0b-6b1b-4f62-b89d-a40fd9125d72', m_ombros, NULL,      eq_halt, 'weight_reps'),
  ('30a28ea3-85d2-470b-919e-6595d2146f9e', NULL,                'ed2d5b0b-6b1b-4f62-b89d-a40fd9125d72', m_ombros, NULL,      eq_maq, 'weight_reps'),
  -- Elevação Lateral de Pernas (e052)
  ('1cb0a0e7-c49a-4cf6-b141-f8970202f7a4', NULL,                'f570f1a2-d289-4685-97e2-37649f9ae4b7', m_glut,   NULL,      eq_pc, 'reps'),
  -- Elevação Pélvica (e053)
  ('8084f766-52d3-418b-9507-231367c052d0', NULL,                '3c14deb9-7bde-43fa-8b2d-804c20fe443c', m_glut,   m_post,    eq_barra, 'weight_reps'),
  ('0050cb5f-2281-411d-a9a1-efcd99a2ded8', NULL,                '3c14deb9-7bde-43fa-8b2d-804c20fe443c', m_glut,   m_post,    eq_maq, 'weight_reps'),
  ('afa2f413-b299-4e81-a95a-1ed84e232365', NULL,                '3c14deb9-7bde-43fa-8b2d-804c20fe443c', m_glut,   m_post,    eq_smith, 'weight_reps'),
  -- Elevação Y (e054)
  ('bea10a80-2e50-4a68-b5d3-981601161c84', 'com Apoio',         'cbc368c1-0fe8-4d81-9065-a4513ec3bce6', m_ombros, m_costas,  eq_halt, 'weight_reps'),
  -- Extensão de Panturrilha (e055)
  ('0f18634b-fa35-4021-8c29-0431c1c59721', NULL,                '01dc095b-8d6e-416f-94b3-32a96bff66bf', m_pant,   NULL,      eq_maq, 'weight_reps'),
  -- Extensão de Tríceps (e056)
  ('9edab45b-c6a5-476d-ba7b-dcda5e88fbc9', NULL,                '26621ba2-48ee-4137-b849-33c6f8eedd2b', m_triceps,NULL,      eq_barra, 'weight_reps'),
  ('b0eb213a-6a48-41fc-b906-14d81c36143b', NULL,                '26621ba2-48ee-4137-b849-33c6f8eedd2b', m_triceps,NULL,      eq_cabo, 'weight_reps'),
  ('435731b5-4b0a-4e69-82a1-4b80e156f75c', NULL,                '26621ba2-48ee-4137-b849-33c6f8eedd2b', m_triceps,NULL,      eq_halt, 'weight_reps'),
  ('4792977e-2c01-4e63-a9aa-413f2ae2fd45', NULL,                '26621ba2-48ee-4137-b849-33c6f8eedd2b', m_triceps,NULL,      eq_maq, 'weight_reps'),
  -- Extensão de Tríceps Acima da Cabeça (e057)
  ('459845bb-5b29-4a90-a347-c87204a16bea', NULL,                'ad4f3f69-e74c-487d-9d3d-7742be9f1a1c', m_triceps,NULL,      eq_cabo, 'weight_reps'),
  -- Extensão Lombar (e058)
  ('0500eb80-8bbe-46b2-b990-7567b3b41cbe', NULL,                '3533f5a4-700b-44f0-9137-2e6018b3e664', m_lomb,   NULL,      eq_maq, 'weight_reps'),
  -- Face Pull (e059)
  ('10a9ec26-8669-4734-81c7-963a9d186260', NULL,                'ea87f7b5-517f-4a9d-b9bc-60ebb6d83f3e', m_ombros, m_biceps,  eq_maq, 'weight_reps'),
  -- Flexão (e060)
  ('7a265e8b-8b09-4d29-977c-94bf5892a9e5', 'com Palma',         '7b53fb52-d98b-48e1-817a-2271efa37b8f', m_peito,  m_triceps, eq_pc, 'reps'),
  ('83d04592-a4a2-4bad-9981-f846d1e97fa1', 'com Um Braço',      '7b53fb52-d98b-48e1-817a-2271efa37b8f', m_peito,  m_ombros,  eq_pc, 'reps'),
  ('15d3d224-aed8-40db-908f-2028a1e88984', NULL,                '7b53fb52-d98b-48e1-817a-2271efa37b8f', m_peito,  m_triceps, eq_pc, 'reps'),
  ('1cd0c890-54e5-4fb0-8929-7d1c88d8cbfc', 'de Joelhos',        '7b53fb52-d98b-48e1-817a-2271efa37b8f', m_peito,  m_triceps, eq_pc, 'reps'),
  ('3d745c38-4973-4c89-98a1-3ce3c6e896ad', 'Pegada Fechada',    '7b53fb52-d98b-48e1-817a-2271efa37b8f', m_peito,  m_triceps, eq_pc, 'reps'),
  -- Flexão Declinada (e061)
  ('05091d85-fee6-484f-9bf4-383e7c1cc706', NULL,                '97270a77-4590-4d98-8f7c-573b39cdc046', m_peito,  NULL,      eq_pc, 'reps'),
  -- Flexão Diamante (e062)
  ('014f18fa-915d-4bc2-b347-76b76a27d6c5', NULL,                '04b898e4-55bf-4733-8d41-fb328fa964c5', m_triceps,m_peito,   eq_pc, 'reps'),
  -- Flexão em Parada de Mão (e063)
  ('87d8bcb5-135a-47ba-91f6-1a526c0e8f7f', NULL,                'dd05297c-6f85-4a3f-a82c-5fd984dd0f67', m_ombros, m_peito,   eq_pc, 'reps'),
  -- Flexão Inclinada (e064)
  ('c7b526f2-e0e1-468c-8593-dc1e775188a0', NULL,                '4386cbe1-93bc-459f-a499-79c540bfae11', m_peito,  m_ombros,  eq_pc, 'reps'),
  -- Flexão Nórdica (e065)
  ('e32a6fa1-c52a-4e52-aefc-eff104ce8f21', NULL,                '2c56a43a-8ca0-4e1e-91ad-ecbf56b566ef', m_post,   m_glut,    eq_pc, 'reps'),
  -- Flexão Pike (e066)
  ('b77cda3b-d30b-4d7a-8381-b42de6f00158', NULL,                'c6461752-5391-40af-bd82-1bc5fb784b4c', m_ombros, m_triceps, eq_pc, 'reps'),
  -- Flexão Prancha (e067)
  ('11ef16ce-16b6-419b-ba15-12ac8681511c', NULL,                '541a09fb-2535-4dd5-ba6e-80072de7ce9c', m_peito,  m_ombros,  eq_pc, 'reps'),
  -- Flexora em Pé (e068)
  ('bd994ff0-f1d0-4ffb-832e-71f6edd80afb', NULL,                '91d841ca-d776-41b8-b0af-aac526c361d0', m_post,   m_pant,    eq_maq, 'weight_reps'),
  -- Flutter Kicks (e069)
  ('e2de5813-9d31-4b26-ab73-eb4b8cf9a356', NULL,                '3532f4c4-1861-4f2b-842d-ae9cc9e2a44f', m_abd,    NULL,      eq_pc, 'reps'),
  -- Frog Pumps (e070)
  ('88da8efc-daf6-48a3-9280-bf4a88ec2550', NULL,                '6d4a6e13-781c-4c40-a8bd-71d3809dcfc2', m_glut,   m_post,    eq_halt, 'weight_reps'),
  -- Glute Ham Raise (e071)
  ('7b3b3c08-15be-4d70-82bc-336cdc2b9469', NULL,                'dc9afa03-311b-4e96-9e59-d9991fad051f', m_post,   m_glut,    eq_maq, 'weight_reps'),
  -- Glúteo Kickback (e072)
  ('da3c9c3d-519d-459d-8c3c-77978d6bbb22', NULL,                '2f07b351-9f36-43fd-857f-42dd3cf8624e', m_glut,   m_post,    eq_maq, 'weight_reps'),
  ('2793bf29-7c00-42fc-930e-514d82c646d2', NULL,                '2f07b351-9f36-43fd-857f-42dd3cf8624e', m_glut,   m_post,    eq_cabo, 'weight_reps'),
  ('9fcb131d-5cc3-44e4-bde0-e9ee10a7c572', NULL,                '2f07b351-9f36-43fd-857f-42dd3cf8624e', m_glut,   m_post,    eq_pc, 'reps'),
  -- Bom Dia (e073)
  ('e026b53e-a742-4da7-bb38-049a91364e5e', NULL,                'ab363119-0997-40c2-81f4-2f48c86ad7b1', m_post,   m_glut,    eq_barra, 'weight_reps'),
  -- Hack Squat (e074)
  ('12428007-ba84-4009-88c7-13ccda0b395d', NULL,                '44149327-4633-495f-9a04-3b1a2e6c4ccf', m_quad,   m_glut,    eq_maq, 'weight_reps'),
  -- Heel Taps (e075)
  ('aa530ec5-6a12-414f-9bb3-51a2c8308c18', NULL,                '7038adfd-2622-4612-b84f-ccc31de58fa7', m_abd,    NULL,      eq_pc, 'reps'),
  -- Hex Press (e076)
  ('0c71423f-18c4-4456-8945-b7287a1ce541', NULL,                '357d2451-4056-41f0-8b80-7f03fb653903', m_peito,  m_ombros,  eq_halt, 'weight_reps'),
  -- Hiperextensão de Lombar (e077)
  ('7b552775-ae6a-4334-bd4c-a89b7deb6e82', NULL,                '842e9f97-ab67-4771-81c0-85fe0be99d66', m_lomb,   m_post,    eq_maq, 'weight_reps'),
  -- Hollow Rock (e078)
  ('f66cd435-1132-449a-a999-cc1a1e53850c', NULL,                'e6713638-beab-4db9-a107-c3bd46d7139e', m_abd,    NULL,      eq_pc, 'reps'),
  -- Jackknife (e079)
  ('c52ca5a1-5219-40c5-9b0f-ec46641e70c6', 'Suspenso',          'ae307331-b62f-4752-9a06-81cc5d5559ee', m_abd,    NULL,      eq_pc, 'reps'),
  ('24b96248-330a-472d-85e8-e1c3b3e94d92', NULL,                'ae307331-b62f-4752-9a06-81cc5d5559ee', m_abd,    NULL,      eq_pc, 'reps'),
  -- JM Press (e080)
  ('bf33f6c7-65c8-4605-884c-cf766337dc2a', NULL,                'b3ee0202-cfdc-4115-935a-ccd7ddfa1952', m_triceps,m_peito,   eq_barra, 'weight_reps'),
  -- Kettlebell Around the World (e081)
  ('3d6ab6c7-2bab-45ac-9687-5eff81ad1732', NULL,                '719bb09d-a4f0-49b6-8856-35cebd200ee1', m_ombros, m_costas,  eq_kb, 'weight_reps'),
  -- Kettlebell Halo (e082)
  ('021e26f5-b9c0-4515-9058-14161c5b5bf9', NULL,                '7a51d108-d3ef-44b0-96c3-27ef626ae491', m_ombros, m_costas,  eq_kb, 'weight_reps'),
  -- Kneeling Pulldown (e083)
  ('6df651b3-c241-49b5-a603-d7aab0f4ab6f', NULL,                '76f012dc-4600-42a3-9a6b-4b538b29e030', m_costas, m_biceps,  eq_elas, 'weight_reps'),
  -- L-Sit (e084)
  ('a96a291c-9934-4fce-a354-9260735b6de0', 'Suspenso',          '6838dc7a-956b-4ccc-8743-27c2504ee3ec', m_abd,    NULL,      eq_pc, 'reps'),
  ('7580e027-ee79-4c52-ba90-cc81ecde9420', 'nas Paralelas',     '6838dc7a-956b-4ccc-8743-27c2504ee3ec', m_abd,    NULL,      eq_pc, 'reps'),
  -- Landmine 180 (e085)
  ('27e94fe8-b7ed-4f6e-b8bd-183d659bf9e4', NULL,                'bcdb53b5-867b-40fc-bd96-c7b8ba25b09f', m_abd,    m_ombros,  eq_barra, 'weight_reps'),
  -- Leg Press 45 (e086)
  ('8b1b6ac8-f6d2-4849-b44d-7259139bccbc', NULL,                'cd7f926a-0de5-47d3-9253-eb9c08d709b4', m_quad,   m_glut,    eq_maq, 'weight_reps'),
  -- Leg Press Horizontal (e087)
  ('e714b6c1-d6d9-45b9-9196-2e9e5079f48b', NULL,                '7f73a5ce-86b1-44b8-aeff-1f1c760d470b', m_quad,   m_post,    eq_maq, 'weight_reps'),
  -- Levantamento Terra (e088)
  ('9d9083db-1b97-4eb4-a2bc-8924af47b5df', NULL,                'd9b4499c-9791-4e23-b25d-3873056c1145', m_glut,   m_post,    eq_elas, 'weight_reps'),
  ('854c3198-7725-4008-a4ff-f6e406a3ba63', NULL,                'd9b4499c-9791-4e23-b25d-3873056c1145', m_glut,   m_post,    eq_barra, 'weight_reps'),
  ('604489a1-87b7-4ef8-a02a-55a1216b8035', NULL,                'd9b4499c-9791-4e23-b25d-3873056c1145', m_glut,   m_post,    eq_halt, 'weight_reps'),
  ('d8d595aa-33b4-4ffd-bfa2-d516a3845c71', NULL,                'd9b4499c-9791-4e23-b25d-3873056c1145', m_glut,   m_post,    eq_smith, 'weight_reps'),
  ('93ba9858-dc12-4ccf-9b71-7d8c1ff527eb', 'Pernas Estendidas', 'd9b4499c-9791-4e23-b25d-3873056c1145', m_post,   m_glut,    eq_barra, 'weight_reps'),
  -- Levantamento Terra Sumô (e089)
  ('230b88b6-6cc1-4308-a9c2-8aba862293c5', NULL,                'f14f182b-77c5-4450-a277-fd17592c237d', m_glut,   m_post,    eq_barra, 'weight_reps'),
  -- Dip (e090)
  ('7c92d8a4-4171-45db-ab95-a47b4ab15669', 'no Banco',          'aab7ca0e-77c8-463b-91bf-791151650672', m_triceps,m_ombros,  eq_pc, 'reps'),
  ('d984eee2-6bb3-4ef4-82a5-d867e244fb52', 'no Chão',           'aab7ca0e-77c8-463b-91bf-791151650672', m_triceps,m_ombros,  eq_pc, 'reps'),
  -- Dip para Peito (e091)
  ('02a6a197-0986-480b-9efb-0618de7b1692', NULL,                '03033496-8485-4765-a676-8c57b986de56', m_peito,  m_ombros,  eq_maq, 'weight_reps'),
  -- Dip para Tríceps (e092)
  ('d755e02c-ccb2-4605-9459-777569488ef9', NULL,                '4185fafe-98f6-4fe0-a620-31eb2acf3044', m_triceps,m_peito,   eq_maq, 'weight_reps'),
  -- Mesa Flexora (e093)
  ('0ab2c4fd-f8f7-428f-8648-468a3c2bf872', NULL,                '1c78c665-d0c1-4360-900c-ed2b02b95661', m_post,   m_pant,    eq_maq, 'weight_reps'),
  ('66d6b487-e846-44f8-88cb-cee19e0bb5e5', 'Unilateral',        '1c78c665-d0c1-4360-900c-ed2b02b95661', m_post,   m_pant,    eq_maq, 'weight_reps'),
  -- Pallof Press (e094)
  ('73a64b56-e64d-44e9-9cec-6aa0b5399c09', NULL,                '8e1a35f8-89d5-45c4-a008-d7b29b1fcc65', m_abd,    m_peito,   eq_maq, 'weight_reps'),
  -- Panturrilha na Prensa (e095)
  ('9357fdc6-6836-45f8-861a-d17aed8456cf', NULL,                '68a05d34-8ef6-4d7c-a46e-05b6f0d277e8', m_pant,   NULL,      eq_maq, 'weight_reps'),
  -- Peck Deck (e096)
  ('31836769-d20d-4b3a-8849-6ac0fc6730f5', NULL,                '0c3f10cb-e51a-4f1b-a594-ec02793cef9c', m_peito,  NULL,      eq_maq, 'weight_reps'),
  -- Ponte de Glúteos (e097)
  ('3a67c8dd-59f2-47c0-8342-f1555944b39e', 'Parcial',           'a38c4127-7722-423d-ba3d-dc896fef5801', m_glut,   m_post,    eq_barra, 'weight_reps'),
  ('3f1f06b5-b817-4337-b54f-74120819d95b', NULL,                'a38c4127-7722-423d-ba3d-dc896fef5801', m_glut,   m_post,    eq_barra, 'weight_reps'),
  -- Prancha (e098)
  ('0edfb728-a143-4e07-83a7-ac4f7ec1096e', NULL,                '4847c7ab-ea7e-419d-aa3e-c32a5896a35b', m_abd,    NULL,      eq_pc, 'duration'),
  -- Pressdown de Tríceps (e099)
  ('a18efe82-9fa9-4468-b470-621b34ee2b68', NULL,                '996ae939-e389-4b95-93af-089ed36c0345', m_triceps,NULL,      eq_maq, 'weight_reps'),
  -- Pull Through no Cabo (e100)
  ('e0e419e7-8998-4658-a32a-a6be2775d311', NULL,                '74531d60-d4f4-49c1-81b9-83577efbfb38', m_glut,   m_post,    eq_maq, 'weight_reps'),
  -- Pullover (e101)
  ('5a7df43f-cc4c-4148-9055-be86da27346a', NULL,                'a54dae85-0ee8-4640-8e5c-6c7e6727d8a8', m_costas, m_peito,   eq_halt, 'weight_reps'),
  ('9f33ea45-3396-4d1d-9b3a-c8ac3bdd4f6d', NULL,                'a54dae85-0ee8-4640-8e5c-6c7e6727d8a8', m_costas, m_peito,   eq_maq, 'weight_reps'),
  -- Push Press (e102)
  ('93993cb0-e8bf-46a0-90e1-9fd670d564e8', NULL,                '22679ca5-ff11-43f0-892f-c06d27ed7ba2', m_ombros, m_triceps, eq_barra, 'weight_reps'),
  -- Pushdown de Tríceps (e103)
  ('158c13a7-b20c-4a20-bb04-14c52f8e028f', NULL,                '34659a06-4529-4308-ae97-7c7a91f98e89', m_triceps,NULL,      eq_maq, 'weight_reps'),
  -- Puxada com Braço Estendido (e104)
  ('ec73930c-989a-41d0-ab05-8cf72c437368', NULL,                'e105c303-d6c3-4c2d-ac24-0dcc142c8f40', m_costas, m_triceps, eq_cabo, 'weight_reps'),
  ('83e7f2b3-0e89-487d-8365-5b32238a3927', 'com Corda',         'e105c303-d6c3-4c2d-ac24-0dcc142c8f40', m_costas, m_triceps, eq_cabo, 'weight_reps'),
  -- Puxada Frontal (e105)
  ('3385d001-549d-4c56-bdd7-0602c30449a0', NULL,                '0db36693-5543-448e-aea7-1ab030899a54', m_costas, m_biceps,  eq_elas, 'weight_reps'),
  ('bdb21e3e-5b3a-4f4c-8800-efaae09b71cb', NULL,                '0db36693-5543-448e-aea7-1ab030899a54', m_costas, m_biceps,  eq_cabo, 'weight_reps'),
  ('a8ddd72c-d88e-46cb-aedb-2e6370472bda', NULL,                '0db36693-5543-448e-aea7-1ab030899a54', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  ('531f76e6-5ade-442f-b228-023c752a92a4', 'Pegada Fechada',    '0db36693-5543-448e-aea7-1ab030899a54', m_costas, m_biceps,  eq_cabo, 'weight_reps'),
  -- Rack Pull (e106)
  ('feea0956-a7af-4f0b-83f4-ad082c6bedff', NULL,                'c97df85e-5103-481d-8a3c-0c888184118a', m_costas, m_glut,    eq_barra, 'weight_reps'),
  -- Remada Alta (e107)
  ('54c7b8a3-bcc4-4964-aff7-dffa306f064a', NULL,                'cfa8d44e-368e-4bc6-a876-7553b8576ac7', m_ombros, m_costas,  eq_barra, 'weight_reps'),
  ('5af1602b-9501-42f9-a61a-cd14b9d18c98', NULL,                'cfa8d44e-368e-4bc6-a876-7553b8576ac7', m_ombros, m_costas,  eq_cabo, 'weight_reps'),
  ('d316a8c9-c25f-41fc-b803-46a4432906cb', NULL,                'cfa8d44e-368e-4bc6-a876-7553b8576ac7', m_ombros, m_costas,  eq_halt, 'weight_reps'),
  ('34b0a26f-5b85-4c7e-97ac-7118d1c118c8', 'Unilateral',        'cfa8d44e-368e-4bc6-a876-7553b8576ac7', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  -- Remada Baixa (e108)
  ('4750782f-531a-48d4-b187-f4a83b1554c3', NULL,                '9119ee68-a5ee-4006-bf31-b74cc6b3b512', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  ('f51356c6-b22c-4fc9-9c9d-98011b226606', 'Unilateral',        '9119ee68-a5ee-4006-bf31-b74cc6b3b512', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  -- Remada Cavalinho (e109)
  ('f17d53a3-cc45-4c58-b478-e8f0969fc197', NULL,                'e9ebcfc6-9b3d-4740-8a5e-9184fec94ca6', m_costas, m_biceps,  eq_barra, 'weight_reps'),
  -- Remada Curvada (e110)
  ('453089fe-cc3b-4b33-b84c-5a98b5bfc0cd', NULL,                '5340f56a-d671-4bae-a726-ec5cf037dff4', m_costas, m_biceps,  eq_elas, 'weight_reps'),
  ('94538604-19f2-45d2-847b-5ea0705cf2ee', NULL,                '5340f56a-d671-4bae-a726-ec5cf037dff4', m_costas, m_biceps,  eq_barra, 'weight_reps'),
  ('d9b13d32-b7da-463c-8c2a-f91e6a6b418b', NULL,                '5340f56a-d671-4bae-a726-ec5cf037dff4', m_costas, m_biceps,  eq_halt, 'weight_reps'),
  -- Remada Gorila (e111)
  ('d8109fad-0c2e-499a-80c3-11a1353f3325', NULL,                'd53f500f-ea1f-42cd-a556-c0cb23920b57', m_costas, m_biceps,  eq_kb, 'weight_reps'),
  -- Remada Inclinada (e112)
  ('9406f35d-e59c-45f5-8474-306b55cc9f7b', 'com Apoio',         'a78faa97-cf3f-4ec0-8c13-6e01b0d0cef7', m_costas, m_biceps,  eq_halt, 'weight_reps'),
  -- Remada Invertida (e113)
  ('0b627f9d-3f40-4ba2-9b40-289fa4d19432', NULL,                'c3962733-254c-4c57-bfe6-6396abe814b0', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  -- Remada (e114)
  ('9cd87c30-6aaa-4d2b-98dc-12870fc07ca8', 'Unilateral',        '1cf47217-225b-4837-a772-ff34e9074002', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  -- Remada Landmine (e115)
  ('7fbbc4dc-42bf-4b4f-ab1f-2686ee3cc976', NULL,                'd9644c72-9290-48e7-80a1-3ad5db84ef98', m_costas, m_biceps,  eq_barra, 'weight_reps'),
  -- Remada Meadows (e116)
  ('a561a665-b32f-4f32-b23f-de9fab436095', NULL,                '0270c5ba-7a8e-4fda-a213-49e88322b4b0', m_costas, m_biceps,  eq_barra, 'weight_reps'),
  -- Remada Pendlay (e117)
  ('818ecf31-4805-4256-a6c3-1a438667cbb9', NULL,                '1d60e7cd-e5ed-4ebb-b974-e1034d917510', m_costas, m_biceps,  eq_barra, 'weight_reps'),
  -- Remada Unilateral (e118)
  ('8d09b01f-df81-478d-9ea2-b27c3fcd6e0c', NULL,                '2efccc6d-919d-44e4-a449-695ad8f2dccd', m_costas, m_biceps,  eq_halt, 'weight_reps'),
  -- Roda Abdominal (e119)
  ('403562a9-ee4f-4929-bd46-1362967cb25f', NULL,                'ac766105-46d9-4f0c-9f11-d7a4b5041a08', m_abd,    NULL,      eq_pc, 'reps'),
  -- Rosca 21 (e120)
  ('d31b225a-598d-4326-b0ca-65acc3b872d2', NULL,                '18e5a627-d5dd-424f-a612-bf8400003dcb', m_biceps, NULL,      eq_barra, 'weight_reps'),
  -- Rosca (e121)
  ('f5fff020-4fa7-4eb5-b6fc-c3d791658b21', NULL,                'f4f26eb0-93d7-41ee-82df-b694a992c80d', m_biceps, m_antebr,  eq_anil, 'weight_reps'),
  ('3a1cec51-f561-4e1b-bc3a-13b1ad5e212a', NULL,                'f4f26eb0-93d7-41ee-82df-b694a992c80d', m_biceps, NULL,      eq_barraw, 'weight_reps'),
  ('8328c16a-2feb-40b0-a7bd-26b21d510da7', NULL,                'f4f26eb0-93d7-41ee-82df-b694a992c80d', m_biceps, NULL,      eq_kb, 'weight_reps'),
  -- Rosca Concentrada (e122)
  ('2e00e5c8-f3a1-4573-92cf-72819a5ba3ed', NULL,                '9529a324-8504-418b-adf6-5e0a41664f7e', m_biceps, NULL,      eq_halt, 'weight_reps'),
  -- Rosca de Punho por Trás (e123)
  ('8326ed93-b178-43cb-8759-f8448b7fb481', NULL,                'f33aa644-e073-4473-b33b-985993397298', m_antebr, NULL,      eq_barra, 'weight_reps'),
  -- Rosca Direta (e124)
  ('f3088974-6010-4149-a572-2f66fc188811', NULL,                '82e7b25b-da7d-448a-b759-9175d1ddb7b1', m_biceps, NULL,      eq_barra, 'weight_reps'),
  ('6578d865-29bf-47f6-bee8-0f9040a282cc', NULL,                '82e7b25b-da7d-448a-b759-9175d1ddb7b1', m_biceps, NULL,      eq_cabo, 'weight_reps'),
  ('3724b06d-15fa-4a3c-bb8c-8d8d8155165f', NULL,                '82e7b25b-da7d-448a-b759-9175d1ddb7b1', m_biceps, NULL,      eq_halt, 'weight_reps'),
  ('356b8ec6-679a-44e2-85f4-aabccceb37ed', NULL,                '82e7b25b-da7d-448a-b759-9175d1ddb7b1', m_biceps, NULL,      eq_maq, 'weight_reps'),
  -- Rosca Drag (e125)
  ('abbb4b7b-b495-4bbb-9f4a-31e5e8bb38b9', NULL,                '96241a67-1874-4f61-9a18-7094712d91ab', m_biceps, NULL,      eq_barra, 'weight_reps'),
  -- Rosca Martelo (e126)
  ('69efe172-b358-4156-97c7-b35037c3ec4f', NULL,                '1af208ad-1619-4d3f-b8e4-297fb29873ef', m_biceps, m_antebr,  eq_elas, 'weight_reps'),
  ('38918923-81fe-4ed1-a2b6-95c1e28d0ab6', NULL,                '1af208ad-1619-4d3f-b8e4-297fb29873ef', m_biceps, m_antebr,  eq_cabo, 'weight_reps'),
  ('37b8708b-b9b7-4d39-b0f5-7d6f70398b52', NULL,                '1af208ad-1619-4d3f-b8e4-297fb29873ef', m_biceps, m_antebr,  eq_halt, 'weight_reps'),
  ('919aa239-6501-4f43-9d62-129837fe21c5', 'Cruzada',           '1af208ad-1619-4d3f-b8e4-297fb29873ef', m_biceps, m_antebr,  eq_halt, 'weight_reps'),
  -- Rosca Overhead (e127)
  ('bcde995a-963a-4494-a8d3-ba7feb917d37', NULL,                '592adc03-84e0-4d6a-b29a-432263e0a3d4', m_biceps, NULL,      eq_cabo, 'weight_reps'),
  -- Rosca Pinwheel (e128)
  ('d71fd9c2-f440-423c-b356-b3721786265f', NULL,                '6a1d8dca-c66f-4704-a85e-aa247db7b126', m_biceps, m_antebr,  eq_halt, 'weight_reps'),
  -- Rosca por Trás (e129)
  ('fede7f50-66c0-4af8-b62e-0399271b2d5c', NULL,                '58a56cba-c652-4fb0-a7e8-c7f1f3a9ec4e', m_biceps, NULL,      eq_cabo, 'weight_reps'),
  -- Rosca Scott (e130)
  ('7b7dd056-b5f0-4ed6-8fcc-b670bd6b7aa0', NULL,                '27107df2-4046-4ef2-bc95-50d3f197454d', m_biceps, NULL,      eq_barra, 'weight_reps'),
  ('6d3a9f7c-71aa-4d33-842f-8ce9914fe335', NULL,                '27107df2-4046-4ef2-bc95-50d3f197454d', m_biceps, NULL,      eq_halt, 'weight_reps'),
  ('1d5c1719-bae1-4244-80c3-e6ec0814f30f', NULL,                '27107df2-4046-4ef2-bc95-50d3f197454d', m_biceps, NULL,      eq_maq, 'weight_reps'),
  -- Rosca Waiter (e131)
  ('d4e85089-69c8-4b16-9e25-d6c29557006c', NULL,                '7bb6437a-df19-4670-8109-3e095acbdc8b', m_biceps, m_antebr,  eq_halt, 'weight_reps'),
  -- Rosca Zottman (e132)
  ('89ea2cfc-e679-4050-9c39-9677784cdd77', NULL,                'c1272677-46ad-40e9-b705-15b74164b06e', m_biceps, m_antebr,  eq_halt, 'weight_reps'),
  -- Rotação de Tronco (e133)
  ('85128651-7810-4b56-ac72-8e659c537c47', NULL,                'a77ac944-b60d-410a-b727-2917788ae09a', m_abd,    NULL,      eq_maq, 'weight_reps'),
  -- Rotação no Cabo (e134)
  ('180b1bf9-3bb1-4f59-978e-b6722adaeab2', 'de Baixo para Cima','4782cef7-9fab-462f-8100-3a961c650cf1', m_abd,    NULL,      eq_maq, 'weight_reps'),
  ('c8e763e4-4fb1-4d2a-a2e3-abae41b55b1b', 'de Cima para Baixo','4782cef7-9fab-462f-8100-3a961c650cf1', m_abd,    NULL,      eq_maq, 'weight_reps'),
  -- Salto de Sapo (e135)
  ('5bbb3f76-0532-4ec7-9625-67dcc5b172ed', NULL,                'f53e9af4-a4b3-4ac2-ba01-4cabaf6b5880', m_quad,   m_glut,    eq_pc, 'reps'),
  -- Salto Lateral no Caixote (e136)
  ('48fc67be-3bc9-4657-bebd-5b845d9bc0b7', NULL,                '5c3df913-6b4f-4f60-8084-3daa796547f9', m_quad,   m_post,    eq_pc, 'reps'),
  -- Salto no Caixote (e137)
  ('2cafe6b3-226d-4e63-9ef1-d3cec5738c7d', NULL,                'df2681c1-7bf3-4ca0-b82d-0a0a7e89c7c8', m_quad,   m_post,    eq_pc, 'reps'),
  -- Squeeze Press (e138)
  ('03925a0c-e1fc-48fa-baa9-ec18d6700435', NULL,                '10f27594-7c4e-4ef9-ad97-2826a6773a77', m_peito,  m_ombros,  eq_halt, 'weight_reps'),
  -- Step Up (e139)
  ('332e5bcf-cc9a-4873-a026-82a86c75d499', NULL,                '829dfbed-e3ed-4b24-8a72-95972772cf7d', m_quad,   m_post,    eq_pc, 'reps'),
  ('aedbaa0b-e21f-4685-8565-113e51b3c548', NULL,                '829dfbed-e3ed-4b24-8a72-95972772cf7d', m_quad,   m_glut,    eq_halt, 'weight_reps'),
  -- Superman (e140)
  ('fc20f447-15ea-4e69-9b75-969a53b6795a', NULL,                '6ad56076-cc17-4c22-af6b-8fc16e4b3a0d', m_lomb,   m_glut,    eq_pc, 'reps'),
  -- Supino com Anilha (e141)
  ('aebd3121-1dd4-4c27-a765-16fe0310effb', NULL,                '7fffec13-4aec-401f-9bb9-d088fca94114', m_peito,  m_ombros,  eq_anil, 'weight_reps'),
  -- Supino com Pés Elevados (e142)
  ('138d07e9-ca76-4ee9-a2dd-1668703d4d0f', NULL,                'bc57be7e-0d79-49f8-9ff3-db1295badea1', m_peito,  m_ombros,  eq_barra, 'weight_reps'),
  -- Supino Declinado (e143)
  ('973c5409-ce24-4b3c-9699-d75ee9868af8', NULL,                'c7ddec5f-188f-4163-81a0-5ef0b7be57da', m_peito,  m_ombros,  eq_barra, 'weight_reps'),
  ('1ac5eee6-88f9-4bd4-893c-0b2a6ddc578e', NULL,                'c7ddec5f-188f-4163-81a0-5ef0b7be57da', m_peito,  m_ombros,  eq_halt, 'weight_reps'),
  ('2b5bf693-7d98-4995-9836-b40a338420d1', NULL,                'c7ddec5f-188f-4163-81a0-5ef0b7be57da', m_peito,  m_ombros,  eq_maq, 'weight_reps'),
  ('db50474f-7d5a-4b7b-9ab4-a7e0f28916dc', NULL,                'c7ddec5f-188f-4163-81a0-5ef0b7be57da', m_peito,  m_ombros,  eq_smith, 'weight_reps'),
  -- Supino Inclinado (e144)
  ('96056baf-9aee-4050-88ae-5845ac8b29fa', NULL,                'a624f2b9-e5b1-4210-83e3-419cb86f7660', m_peito,  m_triceps, eq_barra, 'weight_reps'),
  ('4cc66358-4798-4317-bc41-01ced6a94d94', NULL,                'a624f2b9-e5b1-4210-83e3-419cb86f7660', m_peito,  m_triceps, eq_halt, 'weight_reps'),
  ('55d0ce0f-4f89-4594-81ec-d3aaa8ab3152', NULL,                'a624f2b9-e5b1-4210-83e3-419cb86f7660', m_peito,  m_ombros,  eq_smith, 'weight_reps'),
  ('395bbe60-c9c2-4f2a-b4ac-549b3722aa4c', NULL,                'a624f2b9-e5b1-4210-83e3-419cb86f7660', m_peito,  m_ombros,  eq_maq, 'weight_reps'),
  -- Supino (e145)
  ('5e1928c3-065c-413d-9981-63d8b0681bb9', 'Unilateral',        'a5990bb4-be1d-43ae-89cd-a7bb80f33040', m_peito,  m_ombros,  eq_maq, 'weight_reps'),
  ('db558974-e496-4232-8002-be15247f9214', NULL,                'a5990bb4-be1d-43ae-89cd-a7bb80f33040', m_peito,  m_ombros,  eq_elas, 'weight_reps'),
  ('743194d6-145d-4466-863e-f4b854b04c09', NULL,                'a5990bb4-be1d-43ae-89cd-a7bb80f33040', m_peito,  m_ombros,  eq_maq, 'weight_reps'),
  ('c82a7007-0a6a-43ef-88fe-7251cc4241ca', 'Pegada Fechada',    'a5990bb4-be1d-43ae-89cd-a7bb80f33040', m_triceps,m_peito,   eq_barra, 'weight_reps'),
  -- Supino no Chão (e146)
  ('ca6597f6-c3ce-43fe-8278-289db9329b13', NULL,                '7331b0db-ebbc-43bd-a169-765089abc12c', m_peito,  m_ombros,  eq_barra, 'weight_reps'),
  ('f010f61d-e310-4ec3-9aa6-1865c730ad9e', NULL,                '7331b0db-ebbc-43bd-a169-765089abc12c', m_peito,  m_ombros,  eq_halt, 'weight_reps'),
  -- Suspensão na Barra (e147)
  ('54a0e5cb-f97f-4713-bba2-d1901a7d1832', NULL,                '7e536b66-0f8d-4838-8ae8-bd9c61e2c030', m_costas, m_antebr,  eq_pc, 'reps'),
  -- Svend Press (e148)
  ('79ca522e-b253-45e4-a11f-9977312fbb70', NULL,                '886811f2-bda7-4f03-ac12-35f2f78a484f', m_peito,  m_ombros,  eq_anil, 'weight_reps'),
  -- Tesoura Abdominal (e149)
  ('32d53386-4ab1-4e6a-b7b7-04e4693e5f04', NULL,                'add7e2e8-8a6a-4390-843e-fb366b271e27', m_abd,    NULL,      eq_pc, 'reps'),
  -- Toe Touch (e150)
  ('3a3d745d-1aea-44f6-866c-99e778b90494', NULL,                '9d77abb3-b32a-4624-86b2-f4bb18aaf63e', m_abd,    NULL,      eq_pc, 'reps'),
  -- Toes to Bar (e151)
  ('97855432-86be-4bc7-90c5-867587788cc8', NULL,                'c157a66b-be1a-46d7-b03b-4b220d403a29', m_abd,    m_antebr,  eq_pc, 'reps'),
  -- Tração Vertical (e152)
  ('82f6668a-1f2f-448d-b198-60702d15fd40', NULL,                '1fbcc72a-1055-4f53-a303-ae4800f32100', m_costas, m_biceps,  eq_maq, 'weight_reps'),
  -- Tríceps Corda (e153)
  ('68afa67b-6d69-4d43-9d4c-eb783a67dec5', NULL,                '893bf8af-ee7b-4e01-84c1-0dc00f213ce1', m_triceps,NULL,      eq_maq, 'weight_reps'),
  -- Tríceps Cotovelo Aberto (e154)
  ('67afd580-2e7f-4f82-afa4-03f8e1d48180', NULL,                '9e6dee6e-1b7c-4567-8ad7-64a49757dc34', m_triceps,m_peito,   eq_halt, 'weight_reps'),
  -- Tríceps Kickback (e155)
  ('5b96a6db-d29e-4157-abe0-0ec274939146', NULL,                '55d83dc2-cd6b-4c22-8246-1a2c9bf6d871', m_triceps,NULL,      eq_cabo, 'weight_reps'),
  ('0664797f-2ebb-406b-9004-f300f5bdca6b', NULL,                '55d83dc2-cd6b-4c22-8246-1a2c9bf6d871', m_triceps,NULL,      eq_halt, 'weight_reps'),
  -- V Up (e156)
  ('801e2166-66af-48fe-a4e3-ef6481d392f8', NULL,                'c104725c-9fa6-438c-82bc-1baf5a7c0f8f', m_abd,    NULL,      eq_pc, 'reps'),
  -- Preparatórios públicos
  ('f74a7f21-2562-4f56-929e-f7af6d1e7d11', NULL,                '0fe01367-8314-4ee0-bc36-67b826c04e81', m_post,   NULL,      eq_pc, 'duration'),
  ('df098e8d-d145-4f5e-9269-6f01a2b58bd3', NULL,                '81813c26-484c-470d-a557-9fb8a36cd8ce', m_peito,  NULL,      eq_pc, 'duration'),
  ('0c62f82d-84e3-4a79-b1c8-0ef9df398630', NULL,                '95358b8e-d2b7-4728-9119-28b9e6716327', m_glut,   m_quad,    eq_pc, 'duration'),
  ('ed233d9f-7cb4-477d-b38e-94704d7a5953', NULL,                '6c1b1d7b-7994-4ff1-aa63-20e0ca3df1fd', m_ombros, NULL,      eq_pc, 'reps'),
  ('f38dfc69-3e04-4c3d-8880-0e4e47ae8f9d', NULL,                '49a46ea8-7dcf-4ad8-9489-86f5a7d4b029', m_quad,   m_pant,    eq_pc, 'duration')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------
-- EXERCÍCIOS PRIVADOS
-- teste1@teste.com (Carlos Mendes — coach, emagrecimento)
-- teste3@teste.com (Lucas Silva — athlete)
-- ------------------------------------------------
INSERT INTO public.exercises (id, name, user_id, exercise_type) VALUES
  -- Carlos Mendes (coach1) — foco em condicionamento e funcional
  ('2b8c06dd-59b2-4b87-ba43-97b72a5f50ee', 'Burpee',                                u_coach1,   'preparatorio'),
  ('76542b0d-883c-4b90-a7aa-babb9c7f3393', 'Mountain Climber',                      u_coach1,   'preparatorio'),
  ('78592840-103a-49a8-abe8-70849f37df96', 'Polichinelo',                           u_coach1,   'preparatorio'),
  ('3ff45d16-7e94-463f-80db-6b116bd262fa', 'Pular Corda',                           u_coach1,   'preparatorio'),
  ('6644a31f-6673-40ee-bc80-88b074450390', 'High Knees',                            u_coach1,   'preparatorio'),
  ('b3b5f94a-a0ef-4a44-ab9e-713b68ab16ec', 'Kettlebell Swing',                      u_coach1,   'musculacao'),
  ('4b4d4ca9-a6de-4650-acbc-5f93874ae01a', 'Turkish Get-Up',                        u_coach1,   'musculacao'),
  ('b47a7571-1cde-4683-944a-163b80b1f59d', 'Thruster',                              u_coach1,   'musculacao'),
  ('22ab47b0-4f5b-4f36-b510-fbc1214cbc40', 'Wall Ball',                             u_coach1,   'musculacao'),
  ('e2a03321-602b-4888-8e64-12fcf767e202', 'Farmer''s Walk',                        u_coach1,   'musculacao'),
  -- Lucas Silva (athlete1) — exercícios complementares de musculação
  ('e81fbd3a-2cc8-45d1-a53b-6c69b56c7df0', 'Encolhimento de Ombros',                u_athlete1, 'musculacao'),
  ('bb4ecb59-94ee-40eb-aed7-42ea19132bf9', 'Cuban Press',                           u_athlete1, 'musculacao'),
  ('c825934e-7f32-4dad-82a5-1ab911fa751a', 'Crucifixo Inverso na Máquina',          u_athlete1, 'musculacao'),
  ('4f12bcc9-15c9-44dd-8481-d3d4e935e75a', 'Sissy Squat',                           u_athlete1, 'musculacao'),
  ('5dddf6e2-c583-496d-a9eb-979d84624be1', 'Hip Thrust Unilateral',                 u_athlete1, 'musculacao'),
  ('43beff00-12ce-4163-866c-0aaff499268a', 'Pulldown Pegada Neutra',                u_athlete1, 'musculacao'),
  ('2b3e8e49-7f18-4021-bd21-5073107a7e8d', 'Rosca Spider',                          u_athlete1, 'musculacao'),
  ('71619377-b245-438e-8e14-d88710fab79a', 'Pressdown Inverso',                     u_athlete1, 'musculacao')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------
-- VARIAÇÕES PRIVADAS
-- user_id é sincronizado automaticamente pelo trigger
-- variations_sync_scope a partir do exercise_id.
-- ------------------------------------------------
INSERT INTO public.variations (id, name, exercise_id, muscle_id, secondary_muscle_id, equipment_id, measurement_type) VALUES
  -- Carlos Mendes ------------------------------------------------
  -- Burpee
  ('df2c18f8-e0c7-471d-8c82-e9c737b1df15', NULL,                  '2b8c06dd-59b2-4b87-ba43-97b72a5f50ee', m_quad,   m_peito,  eq_pc, 'reps'),
  ('46099bdd-2413-47e4-87ad-4ee6b0c98ce8', 'com Flexão',          '2b8c06dd-59b2-4b87-ba43-97b72a5f50ee', m_peito,  m_quad,   eq_pc, 'reps'),
  ('2587cb3f-83ef-4adb-b2c9-39004411a753', 'com Salto no Caixote','2b8c06dd-59b2-4b87-ba43-97b72a5f50ee', m_quad,   m_glut,   eq_pc, 'reps'),
  -- Mountain Climber
  ('b34c6b9e-5454-4622-a067-d192e8a1941b', NULL,                  '76542b0d-883c-4b90-a7aa-babb9c7f3393', m_abd,    m_quad,   eq_pc, 'reps'),
  ('f760978b-a2cb-4ece-9781-08147bcf4de3', 'Cruzado',             '76542b0d-883c-4b90-a7aa-babb9c7f3393', m_abd,    NULL,     eq_pc, 'reps'),
  -- Polichinelo
  ('77c9ae82-3e78-4be6-b584-6c8a033cf153', NULL,                  '78592840-103a-49a8-abe8-70849f37df96', m_pant,   NULL,     eq_pc, 'reps'),
  -- Pular Corda
  ('53bebbf8-70b0-4534-a5b4-87259e465bda', NULL,                  '3ff45d16-7e94-463f-80db-6b116bd262fa', m_pant,   NULL,     eq_pc, 'duration'),
  ('7630392b-4568-49c9-8ac6-c658ef39f10e', 'Double Under',        '3ff45d16-7e94-463f-80db-6b116bd262fa', m_pant,   m_quad,   eq_pc, 'duration'),
  -- High Knees
  ('cae673dc-cda1-41b9-9603-179e050c1896', NULL,                  '6644a31f-6673-40ee-bc80-88b074450390', m_quad,   m_abd,    eq_pc, 'reps'),
  -- Kettlebell Swing
  ('69c46c1e-47e2-4bbc-b515-555be2d05405', 'Russo',               'b3b5f94a-a0ef-4a44-ab9e-713b68ab16ec', m_glut,   m_post,   eq_kb, 'weight_reps'),
  ('9cec3c23-4bce-44fe-9931-882c41b3b70a', 'Americano',           'b3b5f94a-a0ef-4a44-ab9e-713b68ab16ec', m_glut,   m_ombros, eq_kb, 'weight_reps'),
  -- Turkish Get-Up
  ('545938c2-3739-4ff4-8c5b-4f797676d090', NULL,                  '4b4d4ca9-a6de-4650-acbc-5f93874ae01a', m_ombros, m_abd,    eq_kb, 'weight_reps'),
  ('e8b5e5ee-cd66-47f0-ae03-b4de50f53a6d', NULL,                  '4b4d4ca9-a6de-4650-acbc-5f93874ae01a', m_ombros, m_abd,    eq_halt, 'weight_reps'),
  -- Thruster
  ('a13c207e-1814-4c4b-a7ee-8febe46918be', NULL,                  'b47a7571-1cde-4683-944a-163b80b1f59d', m_quad,   m_ombros, eq_halt, 'weight_reps'),
  ('d9dd6361-d65d-47db-99d2-513c8b970a91', NULL,                  'b47a7571-1cde-4683-944a-163b80b1f59d', m_quad,   m_ombros, eq_barra, 'weight_reps'),
  ('52a6e2de-c910-4a95-9902-03cbc939dde1', NULL,                  'b47a7571-1cde-4683-944a-163b80b1f59d', m_quad,   m_ombros, eq_kb, 'weight_reps'),
  -- Wall Ball
  ('3fd537a1-b99a-4d37-9f37-7eba5bfca02c', NULL,                  '22ab47b0-4f5b-4f36-b510-fbc1214cbc40', m_quad,   m_ombros, eq_pc, 'reps'),
  -- Farmer's Walk
  ('adda59a0-c0f2-422d-a14b-229a9ff41c3a', NULL,                  'e2a03321-602b-4888-8e64-12fcf767e202', m_antebr, m_costas, eq_halt, 'weight_reps'),
  ('e0dbc5d5-d61a-46a1-9f4d-14cd159334b3', NULL,                  'e2a03321-602b-4888-8e64-12fcf767e202', m_antebr, m_costas, eq_kb, 'weight_reps'),

  -- Lucas Silva --------------------------------------------------
  -- Encolhimento de Ombros (Shrug)
  ('9f8386d5-6a15-4c25-a3fe-2b7db81c6630', NULL,                  'e81fbd3a-2cc8-45d1-a53b-6c69b56c7df0', m_costas, NULL,     eq_halt, 'weight_reps'),
  ('e435e23e-6ca5-46dd-b613-217cd3bc5eaf', NULL,                  'e81fbd3a-2cc8-45d1-a53b-6c69b56c7df0', m_costas, NULL,     eq_barra, 'weight_reps'),
  ('545bb8c5-e2dc-4fcd-9364-9fb4fee3485c', NULL,                  'e81fbd3a-2cc8-45d1-a53b-6c69b56c7df0', m_costas, NULL,     eq_maq, 'weight_reps'),
  -- Cuban Press
  ('26dd8488-556c-44b3-8af7-07911f4fcb8e', NULL,                  'bb4ecb59-94ee-40eb-aed7-42ea19132bf9', m_ombros, NULL,     eq_halt, 'weight_reps'),
  -- Crucifixo Inverso na Máquina
  ('4d19b22e-5b73-443d-89fb-dcf215adf86d', NULL,                  'c825934e-7f32-4dad-82a5-1ab911fa751a', m_ombros, m_costas, eq_maq, 'weight_reps'),
  -- Sissy Squat
  ('881e0888-d55b-411e-8ef7-dbbceb54570f', NULL,                  '4f12bcc9-15c9-44dd-8481-d3d4e935e75a', m_quad,   NULL,     eq_pc, 'reps'),
  -- Hip Thrust Unilateral
  ('672ba97c-7ca0-4228-b01f-01edd58d03c4', NULL,                  '5dddf6e2-c583-496d-a9eb-979d84624be1', m_glut,   NULL,     eq_pc, 'reps'),
  ('cbb9153d-5d51-45ab-8773-794ac9045d9b', NULL,                  '5dddf6e2-c583-496d-a9eb-979d84624be1', m_glut,   m_post,   eq_halt, 'weight_reps'),
  -- Pulldown Pegada Neutra
  ('2d7873b1-8c4b-4f91-a4b6-a3d9502dc173', NULL,                  '43beff00-12ce-4163-866c-0aaff499268a', m_costas, m_biceps, eq_maq, 'weight_reps'),
  -- Rosca Spider
  ('4276fe47-44f0-4504-8eee-414814ea8d74', NULL,                  '2b3e8e49-7f18-4021-bd21-5073107a7e8d', m_biceps, NULL,     eq_halt, 'weight_reps'),
  -- Pressdown Inverso
  ('49eeab88-9906-429d-a1f7-ccab072b5d96', NULL,                  '71619377-b245-438e-8e14-d88710fab79a', m_triceps,NULL,     eq_maq, 'weight_reps'),
  -- Corrida (distância — corrida ao ar livre, peso corporal)
  ('3d1f6b82-4c7a-4e95-9f02-1a8c5b3e7d40', NULL,                  '7e5c0a17-9b2d-4c3e-8a1f-2b6d4e8c0a17', m_quad,   m_post,    eq_pc, 'distance')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------
-- COMPARTILHAMENTO DE VARIAÇÕES PRIVADAS
-- As variações criadas pelo coach precisam ficar visíveis para o atleta
-- nos testes de listagem mobile.
-- ------------------------------------------------
INSERT INTO public.shared_variations (variation_id, owner_id, shared_with_id)
SELECT v.id, e.user_id, u_athlete1
FROM public.variations v
JOIN public.exercises e ON e.id = v.exercise_id
WHERE e.user_id = u_coach1
ON CONFLICT (variation_id, shared_with_id) DO NOTHING;

-- ------------------------------------------------
-- VÍDEOS DE REFERÊNCIA (YouTube)
-- URLs do YouTube em variations.video_url (exposto como youtube_url na API).
-- Variações da biblioteca pública.
-- ------------------------------------------------
UPDATE public.variations SET video_url = 'https://www.youtube.com/watch?v=ZaSetOZFo-k'
  WHERE id = '7833c241-b639-4ff2-af20-2d12a8840b6f'; -- Agachamento (barra)
UPDATE public.variations SET video_url = 'https://www.youtube.com/watch?v=ZaTM37cfiDs'
  WHERE id = '854c3198-7725-4008-a4ff-f6e406a3ba63'; -- Levantamento Terra (barra)
UPDATE public.variations SET video_url = 'https://www.youtube.com/watch?v=Qx7XIbUOJlQ'
  WHERE id = 'c82a7007-0a6a-43ef-88fe-7251cc4241ca'; -- Supino Pegada Fechada (barra)
UPDATE public.variations SET video_url = 'https://www.youtube.com/watch?v=pLofEAcfsO8'
  WHERE id = '743194d6-145d-4466-863e-f4b854b04c09'; -- Supino na máquina

-- ------------------------------------------------
-- VÍDEOS ENVIADOS (R2) — biblioteca pública
-- variation_videos guarda uploads no R2 (object_key), não URLs.
-- object_key: catalog/<variation_id>/<file_id>.<ext>
-- PRÉ-REQUISITO: os arquivos precisam existir no bucket R2 nas keys abaixo.
-- processing_status = 'ready' pula o transcode (o trigger só dispara em 'pending').
-- ------------------------------------------------
INSERT INTO public.variation_videos (
  variation_id, object_key, thumbnail_key,
  duration_seconds, size_bytes, content_type,
  uploaded_by, processing_status
) VALUES
  -- Supino na máquina (vídeo da biblioteca pública — uploaded_by NULL)
  ('743194d6-145d-4466-863e-f4b854b04c09',
   'catalog/743194d6-145d-4466-863e-f4b854b04c09/8bb6090d-7712-4473-8774-00292de7ae66.mp4',
   'catalog/743194d6-145d-4466-863e-f4b854b04c09/abc1a465-94cf-49d5-a8e6-23fa7e249ba7.jpg',
   12, 4525741, 'video/mp4', NULL, 'ready'),
  -- Puxada com Braço Estendido "com Corda" (vídeo da biblioteca pública — uploaded_by NULL)
  ('83e7f2b3-0e89-487d-8365-5b32238a3927',
   'catalog/83e7f2b3-0e89-487d-8365-5b32238a3927/93970b6e-eddf-445d-8944-115dd2174932.mp4',
   'catalog/83e7f2b3-0e89-487d-8365-5b32238a3927/f0127175-f542-4b88-ae81-85d5a0ee19d1.jpg',
   15, 5141962, 'video/mp4', NULL, 'ready')
ON CONFLICT (variation_id) DO NOTHING;

END $$;
