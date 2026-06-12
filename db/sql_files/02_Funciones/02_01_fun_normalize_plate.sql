DROP FUNCTION IF EXISTS fun_normalize_plate;

DELIMITER $$

CREATE FUNCTION fun_normalize_plate(p_plate VARCHAR(32))
RETURNS VARCHAR(16)
DETERMINISTIC
NO SQL
BEGIN
  IF p_plate IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN NULLIF(
    UPPER(
      REPLACE(
        REPLACE(
          REPLACE(TRIM(p_plate), ' ', ''),
          '-',
          ''
        ),
        '.',
        ''
      )
    ),
    ''
  );
END$$

DELIMITER ;
