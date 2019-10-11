--
-- PostgreSQL database dump
--

-- Dumped from database version 11.2
-- Dumped by pg_dump version 11.5

-- Started on 2019-10-08 19:23:14 EDT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6563 (class 0 OID 142249)
-- Dependencies: 704
-- Data for Name: tr_data_sources; Type: TABLE DATA; Schema: p0022_rtl_ga; Owner: postgres
--

COPY p0022_rtl_ga.tr_data_sources (id, shortname, name, description, data, type, created_at, updated_at, is_frozen) FROM stdin;
494c9da5-34be-4af1-949d-915859378d60	eod_montreal_2013_mtq	Enquête Origine-Destination 2013 Région de Montréal version MTQ	\N	{"isNew":false}	\N	2019-09-24 14:31:56.644942-04	\N	\N
24ffd47a-4bce-4291-b8eb-9bc304b346b2	rtl_smart_card_2018	Déplacements de cartes à puce RTL 2018	\N	{"isNew":false}	\N	2019-09-28 08:15:42.029318-04	\N	\N
\.


-- Completed on 2019-10-08 19:23:15 EDT

--
-- PostgreSQL database dump complete
--

