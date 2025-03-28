PGDMP  $                    }            chat_db     13.18 (Debian 13.18-1.pgdg120+1)     17.4 (Ubuntu 17.4-1.pgdg20.04+2)     �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            �           1262    16384    chat_db    DATABASE     r   CREATE DATABASE chat_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';
    DROP DATABASE chat_db;
                     postgres    false                        2615    2200    public    SCHEMA        CREATE SCHEMA public;
    DROP SCHEMA public;
                     postgres    false            �           0    0    SCHEMA public    COMMENT     6   COMMENT ON SCHEMA public IS 'standard public schema';
                        postgres    false    4            �           0    0    SCHEMA public    ACL     Q   REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
                        postgres    false    4            �            1259    16389    chats    TABLE     �   CREATE TABLE public.chats (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_private boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.chats;
       public         heap r       postgres    false    4            �            1259    16387    chats_id_seq    SEQUENCE     �   CREATE SEQUENCE public.chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.chats_id_seq;
       public               postgres    false    4    201            �           0    0    chats_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.chats_id_seq OWNED BY public.chats.id;
          public               postgres    false    200            �            1259    16452    roles    TABLE     �   CREATE TABLE public.roles (
    id integer NOT NULL,
    user_id integer,
    role_type smallint NOT NULL,
    chat_id integer NOT NULL
);
    DROP TABLE public.roles;
       public         heap r       postgres    false    4            �            1259    16401    users    TABLE     z   CREATE TABLE public.users (
    id integer NOT NULL,
    nickname text NOT NULL,
    token text,
    subscription date
);
    DROP TABLE public.users;
       public         heap r       postgres    false    4            �            1259    16399    roles_id_seq    SEQUENCE     �   CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.roles_id_seq;
       public               postgres    false    4    203            �           0    0    roles_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.roles_id_seq OWNED BY public.users.id;
          public               postgres    false    202            �            1259    16450    roles_id_seq1    SEQUENCE     �   CREATE SEQUENCE public.roles_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public.roles_id_seq1;
       public               postgres    false    4    205            �           0    0    roles_id_seq1    SEQUENCE OWNED BY     >   ALTER SEQUENCE public.roles_id_seq1 OWNED BY public.roles.id;
          public               postgres    false    204            I           2604    16392    chats id    DEFAULT     d   ALTER TABLE ONLY public.chats ALTER COLUMN id SET DEFAULT nextval('public.chats_id_seq'::regclass);
 7   ALTER TABLE public.chats ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    201    200    201            M           2604    16455    roles id    DEFAULT     e   ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq1'::regclass);
 7   ALTER TABLE public.roles ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    205    204    205            L           2604    16404    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    202    203    203            �          0    16389    chats 
   TABLE DATA           A   COPY public.chats (id, name, is_private, created_at) FROM stdin;
    public               postgres    false    201            �          0    16452    roles 
   TABLE DATA           @   COPY public.roles (id, user_id, role_type, chat_id) FROM stdin;
    public               postgres    false    205            �          0    16401    users 
   TABLE DATA           B   COPY public.users (id, nickname, token, subscription) FROM stdin;
    public               postgres    false    203            �           0    0    chats_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.chats_id_seq', 45, true);
          public               postgres    false    200            �           0    0    roles_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.roles_id_seq', 34, true);
          public               postgres    false    202            �           0    0    roles_id_seq1    SEQUENCE SET     <   SELECT pg_catalog.setval('public.roles_id_seq1', 38, true);
          public               postgres    false    204            O           2606    16396    chats chats_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.chats DROP CONSTRAINT chats_pkey;
       public                 postgres    false    201            S           2606    16457    roles roles_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_pkey;
       public                 postgres    false    205            Q           2606    16449    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public                 postgres    false    203            T           2606    16463    roles roles_chat_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
 B   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_chat_id_fkey;
       public               postgres    false    2895    205    201            U           2606    16458    roles roles_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 B   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_user_id_fkey;
       public               postgres    false    205    203    2897            �   E  x�m�=O�0�g�W���q��� 	�Y���$��C= ъJ�����>wv$��G�V[Zi�2��6
���k��m비a���Q�V��yNC��?ׁHY��u��.��2`tX8R����7Y�3Ɔ�Y�$o%Zqe_
C���0��ȰK�+(�p!�����C{��e���y>�G�:ht��#S%щM<���]�7�nc�H0��1�R"l2\?<�\
"�ȴ-9�Z<�n�?�U���4/۪�q�KG�jh���c1���y��?��j�m�KDq�S_u����ʵ������F"�������`�@uh����UI)� @��;      �   {   x�-��� �V17�r����8�av�"�n�͍/��p��0�>K�I��E^,�i�Jհa1;U�ۨ��-�p*��"�Qx�Ԩq˨��M0[jK��~�3�e������r�$N      �   H  x���ɒ�HE��.�
KeId�!:�@@eV����讲�Z�,���r�~$�XM�=��C�iw=Iq�g;řdJ��&s�J)nޑ۱K���\О*�X�E	�'�����l�"WĔ��l��w�_�=�+Sy��@� !t~�.yS�~u��Q�[����)ݍz�\�ФB@!*=�!F�(F���YD�.Y�!q�_����j���6�;�@i�3���]&�����7F�c�c���uN�n�IYW�@��h	��D]�q+q$xspqU^�X�c���¤�4d�w�]�}L��eg�AE���=�L���S��[V�mM��{�D�����_4���O�q��ԧu�Ҽ� �p��M��o�g��v��K}���V���\t�H)�>��O�5��uf� ۗ�`R��;�ƅ=�/�׬S��4�D�=o�ϖПO�f��Ѯ��/˴�t�U#~��2��zz�=�O_�j�Ck�~ɑ���:=��5[�ɡY����Sb.-�X�x�<]R�]��=Ŷ��B��pE�����_�Z�{C��k �q��%G�r������xLȥ�p;�)����
S�Mr/��]!��Sswϟ���g���1����K��\���u��HCq�P���,	i�1è��[N^�h_�Ă`5m��}�A�(�m}��'�O{L�}��;i6D����&s�
���-EgG�[[�.�Բ-xݪ]+Ԥߚ�*��%��܅�0�?B�8�GȐ�B>a����`YC%��F>\������9b�̍��G'S_����c�W��cŴW��\{��Y�c�5"`���p�mrf+?�LU�T��3�["s���5����?(A	���su]TG�6->��-�ַ+�p�o�A�������2ðqH��o�Vk��_)k_�����CWE0������+�o��l����i���υ&Fw"�(�	ΈQ˝�b�/�f�r󰥛�O{W��'��o[a�ܵ�gL�[t恕e߰��]A�H�O��,�xc���
��u�@���Ze�����9��(�0g攳�i>Ϋ��Hj�17V��!��\,��-     