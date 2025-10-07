<?php
/**
 * API específica para el módulo SPOS Restaurant
 * Ubicación: custom/pos/frontend/api_spos_restaurant.class.php
 */

require_once DOL_DOCUMENT_ROOT.'/api/class/api.class.php';

class SposRestaurantApi extends DolibarrApi
{
    /**
     * Constructor
     */
    public function __construct()
    {
        global $db, $conf;
        $this->db = $db;
    }

    /**
     * Get restaurant layout by entity
     * 
     * @param int $entity Entity ID
     * @return array Layout data
     * 
     * @url GET /layout/{entity}
     */
    public function getLayout($entity)
    {

        $sql = "SELECT * FROM ".MAIN_DB_PREFIX."spos_restaurant_layout";
        $sql .= " WHERE entity = ".((int) $entity);
        $sql .= " AND is_active = 1";
        $sql .= " LIMIT 1";

        dol_syslog("SposRestaurantApi::getLayout sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            if ($this->db->num_rows($result)) {
                $obj = $this->db->fetch_object($result);
                return $this->_cleanObjectDatas($obj);
            } else {
                throw new RestException(404, 'Layout not found');
            }
        } else {
            throw new RestException(500, 'Error fetching layout: '.$this->db->lasterror());
        }
    }

    /**
     * Create restaurant layout
     * 
     * @param array $request_data Layout data
     * @return array Created layout with ID
     * 
     * @url POST /layout
     */
    public function createLayout($request_data = null)
    {
        

        if (!isset($request_data['entity'])) {
            throw new RestException(400, 'Entity is required');
        }

        $sql = "INSERT INTO ".MAIN_DB_PREFIX."spos_restaurant_layout";
        $sql .= " (entity, name, description, background_width, background_height, date_creation, fk_user_creat)";
        $sql .= " VALUES (";
        $sql .= ((int) $request_data['entity']).", ";
        $sql .= "'".$this->db->escape($request_data['name'] ?: 'Layout Principal')."', ";
        $sql .= "'".$this->db->escape($request_data['description'] ?: 'Configuración principal del restaurante')."', ";
        $sql .= ((int) ($request_data['background_width'] ?: 1000)).", ";
        $sql .= ((int) ($request_data['background_height'] ?: 600)).", ";
        $sql .= "NOW(), ";
        $sql .= ((int) DolibarrApiAccess::$user->id);
        $sql .= ")";

        dol_syslog("SposRestaurantApi::createLayout sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            $inserted_id = $this->db->last_insert_id(MAIN_DB_PREFIX."spos_restaurant_layout");
            return array('success' => true, 'inserted_id' => $inserted_id);
        } else {
            throw new RestException(500, 'Error creating layout: '.$this->db->lasterror());
        }
    }

    /**
     * Update layout background image
     * 
     * @param int $layout_id Layout ID
     * @param array $request_data Image data
     * @return array Success response
     * 
     * @url PUT /layout/{layout_id}/image
     */
    public function updateLayoutImage($layout_id, $request_data = null)
    {
        

        if (!isset($request_data['background_image'])) {
            throw new RestException(400, 'background_image is required');
        }

        $sql = "UPDATE ".MAIN_DB_PREFIX."spos_restaurant_layout";
        $sql .= " SET background_image = '".$this->db->escape($request_data['background_image'])."'";
        $sql .= " WHERE rowid = ".((int) $layout_id);

        dol_syslog("SposRestaurantApi::updateLayoutImage sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            return array('success' => true, 'affected_rows' => $this->db->affected_rows($result));
        } else {
            throw new RestException(500, 'Error updating layout image: '.$this->db->lasterror());
        }
    }

    /**
     * Get layout tables
     * 
     * @param int $layout_id Layout ID
     * @return array Tables data
     * 
     * @url GET /layout/{layout_id}/tables
     */
    public function getLayoutTables($layout_id)
    {
       ç
        $sql = "SELECT * FROM ".MAIN_DB_PREFIX."spos_restaurant_mesas";
        $sql .= " WHERE fk_layout = ".((int) $layout_id);
        $sql .= " AND is_active = 1";
        $sql .= " ORDER BY numero";

        dol_syslog("SposRestaurantApi::getLayoutTables sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            $tables = array();
            while ($obj = $this->db->fetch_object($result)) {
                $tables[] = $this->_cleanObjectDatas($obj);
            }
            return $tables;
        } else {
            throw new RestException(500, 'Error fetching tables: '.$this->db->lasterror());
        }
    }

    /**
     * Get layout decorative elements
     * 
     * @param int $layout_id Layout ID
     * @return array Elements data
     * 
     * @url GET /layout/{layout_id}/elements
     */
    public function getLayoutElements($layout_id)
    {
        $sql = "SELECT * FROM ".MAIN_DB_PREFIX."spos_restaurant_elementos";
        $sql .= " WHERE fk_layout = ".((int) $layout_id);
        $sql .= " AND is_active = 1";

        dol_syslog("SposRestaurantApi::getLayoutElements sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            $elements = array();
            while ($obj = $this->db->fetch_object($result)) {
                $elements[] = $this->_cleanObjectDatas($obj);
            }
            return $elements;
        } else {
            throw new RestException(500, 'Error fetching elements: '.$this->db->lasterror());
        }
    }

    /**
     * Create table
     * 
     * @param array $request_data Table data
     * @return array Created table with ID
     * 
     * @url POST /table
     */
    public function createTable($request_data = null)
    {
     

        $required_fields = array('fk_layout', 'entity', 'numero', 'nombre');
        foreach ($required_fields as $field) {
            if (!isset($request_data[$field])) {
                throw new RestException(400, "Field {$field} is required");
            }
        }

        $sql = "INSERT INTO ".MAIN_DB_PREFIX."spos_restaurant_mesas";
        $sql .= " (fk_layout, entity, numero, nombre, capacidad, tipo_mesa, pos_x, pos_y, ancho, alto, color, date_creation)";
        $sql .= " VALUES (";
        $sql .= ((int) $request_data['fk_layout']).", ";
        $sql .= ((int) $request_data['entity']).", ";
        $sql .= ((int) $request_data['numero']).", ";
        $sql .= "'".$this->db->escape($request_data['nombre'])."', ";
        $sql .= ((int) ($request_data['capacidad'] ?: 4)).", ";
        $sql .= "'".$this->db->escape($request_data['tipo_mesa'] ?: 'rectangular')."', ";
        $sql .= ((int) ($request_data['pos_x'] ?: 100)).", ";
        $sql .= ((int) ($request_data['pos_y'] ?: 100)).", ";
        $sql .= ((int) ($request_data['ancho'] ?: 80)).", ";
        $sql .= ((int) ($request_data['alto'] ?: 80)).", ";
        $sql .= "'".$this->db->escape($request_data['color'] ?: '#4F46E5')."', ";
        $sql .= "NOW()";
        $sql .= ")";

        dol_syslog("SposRestaurantApi::createTable sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            $inserted_id = $this->db->last_insert_id(MAIN_DB_PREFIX."spos_restaurant_mesas");
            return array('success' => true, 'inserted_id' => $inserted_id);
        } else {
            throw new RestException(500, 'Error creating table: '.$this->db->lasterror());
        }
    }

    /**
     * Update table position
     * 
     * @param int $table_id Table ID
     * @param array $request_data Position data
     * @return array Success response
     * 
     * @url PUT /table/{table_id}/position
     */
    public function updateTablePosition($table_id, $request_data = null)
    {
       

        if (!isset($request_data['pos_x']) || !isset($request_data['pos_y'])) {
            throw new RestException(400, 'pos_x and pos_y are required');
        }

        $sql = "UPDATE ".MAIN_DB_PREFIX."spos_restaurant_mesas";
        $sql .= " SET pos_x = ".((int) $request_data['pos_x']);
        $sql .= ", pos_y = ".((int) $request_data['pos_y']);
        $sql .= " WHERE rowid = ".((int) $table_id);

        dol_syslog("SposRestaurantApi::updateTablePosition sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            return array('success' => true, 'affected_rows' => $this->db->affected_rows($result));
        } else {
            throw new RestException(500, 'Error updating table position: '.$this->db->lasterror());
        }
    }

    /**
     * Delete table (soft delete)
     * 
     * @param int $table_id Table ID
     * @return array Success response
     * 
     * @url DELETE /table/{table_id}
     */
    public function deleteTable($table_id)
    {
      

        $sql = "UPDATE ".MAIN_DB_PREFIX."spos_restaurant_mesas";
        $sql .= " SET is_active = 0";
        $sql .= " WHERE rowid = ".((int) $table_id);

        dol_syslog("SposRestaurantApi::deleteTable sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            return array('success' => true, 'affected_rows' => $this->db->affected_rows($result));
        } else {
            throw new RestException(500, 'Error deleting table: '.$this->db->lasterror());
        }
    }

    /**
     * Get table proposals (active orders) by entity
     * 
     * @param int $entity Entity ID
     * @return array Proposals data
     * 
     * @url GET /proposals/{entity}
     */
    public function getTableProposals($entity)
    {
       

        $sql = "SELECT p.*, t.nom as client_name";
        $sql .= " FROM ".MAIN_DB_PREFIX."propal p";
        $sql .= " LEFT JOIN ".MAIN_DB_PREFIX."societe t ON p.fk_soc = t.rowid";
        $sql .= " WHERE p.entity = ".((int) $entity);
        $sql .= " AND p.type_proposal = 99"; // Tipo especial para mesas
        $sql .= " AND p.fk_statut IN (0, 1, 2)"; // Estados activos

        dol_syslog("SposRestaurantApi::getTableProposals sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            $proposals = array();
            while ($obj = $this->db->fetch_object($result)) {
                $proposals[] = $this->_cleanObjectDatas($obj);
            }
            return $proposals;
        } else {
            throw new RestException(500, 'Error fetching proposals: '.$this->db->lasterror());
        }
    }

    /**
     * Create element
     * 
     * @param array $request_data Element data
     * @return array Created element with ID
     * 
     * @url POST /element
     */
    public function createElement($request_data = null)
    {
       

        $required_fields = array('fk_layout', 'entity', 'tipo');
        foreach ($required_fields as $field) {
            if (!isset($request_data[$field])) {
                throw new RestException(400, "Field {$field} is required");
            }
        }

        $sql = "INSERT INTO ".MAIN_DB_PREFIX."spos_restaurant_elementos";
        $sql .= " (fk_layout, entity, tipo, nombre, pos_x, pos_y, ancho, alto, color, propiedades, date_creation)";
        $sql .= " VALUES (";
        $sql .= ((int) $request_data['fk_layout']).", ";
        $sql .= ((int) $request_data['entity']).", ";
        $sql .= "'".$this->db->escape($request_data['tipo'])."', ";
        $sql .= "'".$this->db->escape($request_data['nombre'] ?: '')."', ";
        $sql .= ((int) ($request_data['pos_x'] ?: 0)).", ";
        $sql .= ((int) ($request_data['pos_y'] ?: 0)).", ";
        $sql .= ((int) ($request_data['ancho'] ?: 50)).", ";
        $sql .= ((int) ($request_data['alto'] ?: 50)).", ";
        $sql .= "'".$this->db->escape($request_data['color'] ?: '#666666')."', ";
        $sql .= "'".$this->db->escape($request_data['propiedades'] ?: '{}')."', ";
        $sql .= "NOW()";
        $sql .= ")";

        dol_syslog("SposRestaurantApi::createElement sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            $inserted_id = $this->db->last_insert_id(MAIN_DB_PREFIX."spos_restaurant_elementos");
            return array('success' => true, 'inserted_id' => $inserted_id);
        } else {
            throw new RestException(500, 'Error creating element: '.$this->db->lasterror());
        }
    }

    /**
     * Delete element (soft delete)
     * 
     * @param int $element_id Element ID
     * @return array Success response
     * 
     * @url DELETE /element/{element_id}
     */
    public function deleteElement($element_id)
    {
     

        $sql = "UPDATE ".MAIN_DB_PREFIX."spos_restaurant_elementos";
        $sql .= " SET is_active = 0";
        $sql .= " WHERE rowid = ".((int) $element_id);

        dol_syslog("SposRestaurantApi::deleteElement sql=".$sql, LOG_DEBUG);
        $result = $this->db->query($sql);
        if ($result) {
            return array('success' => true, 'affected_rows' => $this->db->affected_rows($result));
        } else {
            throw new RestException(500, 'Error deleting element: '.$this->db->lasterror());
        }
    }
}
?>