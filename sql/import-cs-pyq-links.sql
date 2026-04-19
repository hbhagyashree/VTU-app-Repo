-- VTU SmartPrep CS-family PYQ link import
--
-- This does NOT download or re-host files. It adds external Drive links as PYQ
-- resources for matching subjects already present in your Supabase database.
--
-- How it works:
-- 1. Finds subjects by subject code.
-- 2. Creates a "PYQs" module for each matching subject if it does not exist.
-- 3. Inserts one PYQ document link per subject if the same link is not already saved.
--
-- Run this in Supabase SQL Editor after your subjects are created.

with pyq_sources(code, title, file_url, summary) as (
  values
    ('BMATS101', 'BMATS101 Mathematics-1 for CSE Stream PYQ Collection', 'https://drive.google.com/drive/folders/1mDKxGhwUlKD6XZfBUdUw65SNzasReIeB?usp=drive_link', 'Previous year question papers for Mathematics-1 for CSE Stream.'),
    ('BPHYS102', 'BPHYS102 Applied Physics for CSE Stream PYQ Collection', 'https://drive.google.com/drive/folders/1biIaZZ5aCQRrGVR4llXxvm6GH6Hmg3Jf?usp=drive_link', 'Previous year question papers for Applied Physics for CSE Stream.'),
    ('BPLCK105B', 'BPLCK105B Introduction to Python Programming PYQ Collection', 'https://drive.google.com/drive/folders/1miJKrPrhsutEKCgDRIRqExq--hGzwYkq?usp=drive_link', 'Previous year question papers for Introduction to Python Programming.'),
    ('BPOPS103', 'BPOPS103 Principles of Programming Using C PYQ Collection', 'https://drive.google.com/drive/folders/1o_c60TDHdCa2z4c1TeEQHZumb93w-l5P?usp=drive_link', 'Previous year question papers for Principles of Programming Using C.'),
    ('BCHES202', 'BCHES202 Applied Chemistry for CSE Stream PYQ Collection', 'https://drive.google.com/drive/folders/1i4Hsf1JjwGTW4W9Rmsb7gvLssX23HnKV?usp=drive_link', 'Previous year question papers for Applied Chemistry for CSE Stream.'),
    ('BESCK204H', 'BESCK204H Introduction to Internet of Things PYQ Collection', 'https://drive.google.com/drive/folders/1KhffxmAXOqUQ-WiMLwQko1jBbWLc-QU-?usp=drive_link', 'Previous year question papers for Introduction to Internet of Things.'),
    ('BETCK205I', 'BETCK205I Cyber Security PYQ Collection', 'https://drive.google.com/drive/folders/16gVLEYPQ196WTG3bkdpHi4q6EMjbyvAx?usp=drive_link', 'Previous year question papers for Cyber Security.'),
    ('BMATS201', 'BMATS201 Mathematics-II for CSE Stream PYQ Collection', 'https://drive.google.com/drive/folders/1ey1D5ihL8PDx3TVvoD-mXYIE4dlaIG7W?usp=drive_link', 'Previous year question papers for Mathematics-II for CSE Stream.'),
    ('BPLCK205C', 'BPLCK205C Introduction to Java Programming PYQ Collection', 'https://drive.google.com/drive/folders/12TOspdTC33De-9dm5o172XKBmG-AfsOx?usp=drive_link', 'Previous year question papers for Introduction to Java Programming.'),
    ('BCS301', 'BCS301 Mathematics for Computer Science PYQ Collection', 'https://drive.google.com/folderview?id=1creiW6lCZCprfXr9UneXuqW7XvmeJLOk', 'Previous year question papers for Mathematics for Computer Science.'),
    ('BCS302', 'BCS302 Digital Design and Computer Organization PYQ Collection', 'https://drive.google.com/folderview?id=15SFafZ3oslZg_Bcv1xeuXdnkTro73J4c', 'Previous year question papers for Digital Design and Computer Organization.'),
    ('BCS303', 'BCS303 Operating Systems PYQ Collection', 'https://drive.google.com/folderview?id=1TRXQwEQAq2VAb_2r2okxs9AnVcQhqlbl', 'Previous year question papers for Operating Systems.'),
    ('BCS304', 'BCS304 Data Structures and Applications PYQ Collection', 'https://drive.google.com/folderview?id=1S0NbR9UgSXws5LgDQYC5NO7Fu91VabGB', 'Previous year question papers for Data Structures and Applications.'),
    ('BCS306-A', 'BCS306-A Object Oriented Programming with Java PYQ Collection', 'https://drive.google.com/folderview?id=15DFeeBMLiVx1VpCA0bBSsbQcDetN167a', 'Previous year question papers for Object Oriented Programming with Java.'),
    ('BCS306-B', 'BCS306-B Object Oriented Programming with C++ PYQ Collection', 'https://drive.google.com/folderview?id=1bR2Zr5rJYGXdhtK2baX9N-rBIbjDuER8', 'Previous year question papers for Object Oriented Programming with C++.'),
    ('BCS358D', 'BCS358D Data Visualisation with Python PYQ Collection', 'https://drive.google.com/folderview?id=1aI5AcXeXFkZwePM7Nvbm-jlAX6LgzqWn', 'Previous year question papers for Data Visualisation with Python.'),
    ('BDS306-C', 'BDS306-C Data Analytics with R PYQ Collection', 'https://drive.google.com/folderview?id=1926tyQSg6GdJoRjN6LaLvmpwgrvrnh3w', 'Previous year question papers for Data Analytics with R.'),
    ('BBOC407', 'BBOC407 Biology for Computer Engineers PYQ Collection', 'https://drive.google.com/folderview?id=1edbS8m5lm3sadIoWuaqN8leiWCQyKpFY', 'Previous year question papers for Biology for Computer Engineers.'),
    ('BCS401', 'BCS401 Analysis and Design of Algorithms PYQ Collection', 'https://drive.google.com/folderview?id=1dbv4QGU0P-R4IACqzcsvK6DETpYhGC-8', 'Previous year question papers for Analysis and Design of Algorithms.'),
    ('BCS402', 'BCS402 Microcontrollers PYQ Collection', 'https://drive.google.com/folderview?id=1gVRVIFbcTo0CzugaApGfwLLmDLcoPoVS', 'Previous year question papers for Microcontrollers.'),
    ('BCS403', 'BCS403 Database Management Systems PYQ Collection', 'https://drive.google.com/folderview?id=176jYvzqtg79dqIh7D4ebGLgBY32kJnOI', 'Previous year question papers for Database Management Systems.'),
    ('BCS405A', 'BCS405A Discrete Mathematical Structures PYQ Collection', 'https://drive.google.com/folderview?id=1DfBYSg2-zEnIecZOc90NbQ5mdOFTvf9O', 'Previous year question papers for Discrete Mathematical Structures.'),
    ('BCS405B', 'BCS405B Graph Theory PYQ Collection', 'https://drive.google.com/folderview?id=1Dxz0YBk62BfTsSVlaYjMie6eeriaUBjg', 'Previous year question papers for Graph Theory.'),
    ('BCS456C', 'BCS456C Basics of UI/UX Fundamental Concepts PYQ Collection', 'https://drive.google.com/folderview?id=16y_Pyh4xU2hQ1R5k6qxHbjx_bm6NIhyR', 'Previous year question papers for Basics of UI/UX Fundamental Concepts.'),
    ('BUHK408', 'BUHK408 Universal Human Values Course PYQ Collection', 'https://drive.google.com/folderview?id=1fkWwSSnAEQcUrZSdFxkAFS0DtzzMQBHy', 'Previous year question papers for Universal Human Values Course.'),
    ('BCS501', 'BCS501 Software Engineering and Project Management PYQ Collection', 'https://drive.google.com/drive/folders/135x5WxVAf8p_lCDp8GekZzi9yrYQ7a_D?usp=drive_link', 'Previous year question papers for Software Engineering and Project Management.'),
    ('BCS502', 'BCS502 Computer Networks PYQ Collection', 'https://drive.google.com/drive/folders/1g04ttOd-OvHMBGSd249vUl4xJ1UjocfY?usp=drive_link', 'Previous year question papers for Computer Networks.'),
    ('BCS503', 'BCS503 Theory of Computation PYQ Collection', 'https://drive.google.com/drive/folders/1Ye1unwSutGTLp_8xaCQ8gBht183Ajmak?usp=drive_link', 'Previous year question papers for Theory of Computation.'),
    ('BCS508', 'BCS508 Environmental Studies and E-waste Management PYQ Collection', 'https://drive.google.com/drive/folders/1p-gioXwE0twpR2rWuhT8LYrLkLYpIwtY?usp=drive_link', 'Previous year question papers for Environmental Studies and E-waste Management.'),
    ('BCS515B', 'BCS515B Artificial Intelligence PYQ Collection', 'https://drive.google.com/drive/folders/1fMkdlV5EDqeN3KYhGcxCySzdwbH5Rt2B?usp=drive_link', 'Previous year question papers for Artificial Intelligence.'),
    ('BRMK557', 'BRMK557 Research Methodology and IPR PYQ Collection', 'https://drive.google.com/drive/folders/14UnNsFOWmTR9laOgqq18ZXfDV3k0EZEz?usp=drive_link', 'Previous year question papers for Research Methodology and IPR.'),
    ('BCS601', 'BCS601 Cloud Computing PYQ Collection', 'https://drive.google.com/drive/folders/1Muy0Qc_SYyiSREk6rza-of0yWPEk6eYo?usp=drive_link', 'Previous year question papers for Cloud Computing.'),
    ('BCS602', 'BCS602 Machine Learning PYQ Collection', 'https://drive.google.com/drive/folders/1VdLz_dpRqKzbNmzD-iOyX6LSAqML5lJ_?usp=drive_link', 'Previous year question papers for Machine Learning.'),
    ('BCS613A', 'BCS613A Blockchain Technology PYQ Collection', 'https://drive.google.com/drive/folders/1hrudkNuY0z4FY866ri2eE9hNlCRMv2Kf?usp=drive_link', 'Previous year question papers for Blockchain Technology.'),
    ('BIS613D', 'BIS613D Cloud Computing and Security PYQ Collection', 'https://drive.google.com/drive/folders/1YE4dHNkN80otbwZx_q4Mj03FrXjW5wGS?usp=drive_link', 'Previous year question papers for Cloud Computing and Security.'),
    ('BAI515A', 'BAI515A Computer Vision PYQ Collection', 'https://drive.google.com/drive/folders/1l2JEcDvb8208VV8SV73xk_2vwBXxo0M-?usp=drive_link', 'Previous year question papers for Computer Vision.'),
    ('BAI654x', 'BAI654x Open Elective Course - I PYQ Collection', 'https://drive.google.com/drive/folders/14I_t5PYfT3R7pPjdnv85U0uuWLBWfv3D?usp=drive_link', 'Previous year question papers for Open Elective Course - I.')
),
matched_subjects as (
  select distinct on (s.id, p.file_url)
    s.id as subject_id,
    p.code,
    p.title,
    p.file_url,
    p.summary
  from public.subjects s
  join pyq_sources p
    on lower(coalesce(s.code, '')) = lower(p.code)
    or lower(coalesce(s.code, '')) = lower(regexp_replace(p.code, '^B', ''))
),
created_modules as (
  insert into public.modules (subject_id, title, description, "order")
  select
    ms.subject_id,
    'PYQs',
    'Previous year question papers and exam practice resources.',
    99
  from matched_subjects ms
  where not exists (
    select 1
    from public.modules existing
    where existing.subject_id = ms.subject_id
      and lower(existing.title) = 'pyqs'
  )
  returning id, subject_id
),
target_modules as (
  select distinct on (candidate_modules.subject_id)
    candidate_modules.module_id,
    candidate_modules.subject_id
  from (
    select
      cm.id as module_id,
      cm.subject_id,
      now() as sort_time
    from created_modules cm

    union all

    select
      m.id as module_id,
      m.subject_id,
      m.created_at as sort_time
    from public.modules m
    join matched_subjects ms on ms.subject_id = m.subject_id
    where lower(m.title) = 'pyqs'
  ) candidate_modules
  order by candidate_modules.subject_id, candidate_modules.sort_time desc
)
insert into public.documents (subject_id, module_id, type, title, content, file_url, metadata)
select
  ms.subject_id,
  tm.module_id,
  'pyq',
  ms.title,
  ms.summary,
  ms.file_url,
  jsonb_build_object(
    'import_type', 'external_link',
    'subject_code', ms.code,
    'imported_at', now()
  )
from matched_subjects ms
join target_modules tm on tm.subject_id = ms.subject_id
where not exists (
  select 1
  from public.documents existing
  where existing.subject_id = ms.subject_id
    and existing.type = 'pyq'
    and existing.file_url = ms.file_url
);

-- Optional check after running:
-- select s.code, s.name, d.title, d.file_url
-- from public.documents d
-- join public.subjects s on s.id = d.subject_id
-- where d.type = 'pyq'
-- order by s.code, d.created_at desc;
